import { OrderStatus, Role } from './types';
import { isFullAccess } from './auth';

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_FORWARD_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'RATE_REVIEW', 'ON_HOLD', 'CANCELLED'],
  RATE_REVIEW: ['CONFIRMED', 'ON_HOLD', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'ON_HOLD', 'CANCELLED'],
  PREPARING: ['READY_FOR_DISPATCH', 'ON_HOLD', 'CANCELLED'],
  READY_FOR_DISPATCH: ['DISPATCHED', 'ON_HOLD', 'CANCELLED'],
  DISPATCHED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED', 'RETURNED', 'ON_HOLD'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'PARTIALLY_DELIVERED', 'RETURNED', 'ON_HOLD'],
  DELIVERED: ['COMPLETED', 'RETURNED'],
  PARTIALLY_DELIVERED: ['DELIVERED', 'COMPLETED', 'RETURNED'],
  ON_HOLD: ['NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'CANCELLED'],
  COMPLETED: ['RETURNED'], // Only post-delivery returns
  CANCELLED: [], // Terminal
  RETURNED: [], // Terminal
};

/**
 * Strict Order State Transition Validator
 * Rejects invalid, non-sequential, or unauthorized state transitions.
 */
export function validateOrderStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  actorRole: Role,
  orderTakenById?: string,
  actorUserId?: string,
  deliveryProofAttached?: boolean
): TransitionValidationResult {
  // 1. Same status is a no-op
  if (currentStatus === newStatus) {
    return { valid: false, error: `Order is already in status '${currentStatus}'` };
  }

  // 2. Terminal states check
  if (currentStatus === 'CANCELLED' || currentStatus === 'RETURNED') {
    return {
      valid: false,
      error: `Cannot modify an order that is already '${currentStatus}' (Terminal State).`
    };
  }

  // 3. State machine flow check
  const allowed = ALLOWED_FORWARD_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid status transition: Cannot change status directly from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'None'}.`
    };
  }

  // 4. Role Authorization check
  const fullAccess = isFullAccess(actorRole);
  if (!fullAccess) {
    // Sales users may only CANCEL their OWN order while still NEW or RATE_REVIEW
    if (newStatus === 'CANCELLED') {
      if (orderTakenById && actorUserId && orderTakenById !== actorUserId) {
        return { valid: false, error: 'Forbidden: You can only cancel your own orders.' };
      }
      if (currentStatus !== 'NEW' && currentStatus !== 'RATE_REVIEW') {
        return { valid: false, error: 'Forbidden: Sales users cannot cancel orders once confirmed or in processing.' };
      }
    } else {
      return { valid: false, error: `Forbidden: Only Management (Boss, Controller, Manager) can transition orders to '${newStatus}'.` };
    }
  }

  // 5. Special rate check
  if (currentStatus === 'RATE_REVIEW' && newStatus === 'CONFIRMED' && !fullAccess) {
    return { valid: false, error: 'Forbidden: Special rates require authorized Management approval before confirming.' };
  }

  // 6. Delivery Proof Requirement Gate before DELIVERED
  if (newStatus === 'DELIVERED' && !deliveryProofAttached) {
    return {
      valid: false,
      error: 'Delivery proof (photo upload or signed receipt confirmation) is required before marking order as DELIVERED.'
    };
  }

  return { valid: true };
}

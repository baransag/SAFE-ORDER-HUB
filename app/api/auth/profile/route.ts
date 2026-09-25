import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch personal stats for this employee
  const stats = await db.getStats(user.role, user.id);
  const ownOrders = await db.getOrders({
    role: user.role,
    userId: user.id,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      designation: user.designation,
      role: user.role,
      vehicle: user.vehicle,
      avatar: user.avatar,
      active: user.active,
      languagePreference: user.languagePreference || 'en',
      themePreference: user.themePreference || 'light',
      notificationPreferences: user.notificationPreferences || { orders: true, deliveries: true, approvals: true },
      profileVisibility: user.profileVisibility || 'TEAM',
      createdAt: user.createdAt,
    },
    stats,
    recentOrders: ownOrders.slice(0, 10),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      phone,
      designation,
      avatar,
      currentPassword,
      newPassword,
      languagePreference,
      themePreference,
      notificationPreferences,
      profileVisibility,
    } = body;

    const updates: any = {};

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updates.name = name.trim();
    }
    if (phone && typeof phone === 'string') {
      updates.phone = phone.trim();
    }
    if (designation && typeof designation === 'string') {
      updates.designation = designation.trim();
    }
    if (avatar && typeof avatar === 'string') {
      updates.avatar = avatar.trim();
    }
    if (languagePreference && ['en', 'ur'].includes(languagePreference)) {
      updates.languagePreference = languagePreference;
    }
    if (themePreference && ['light', 'dark', 'system'].includes(themePreference)) {
      updates.themePreference = themePreference;
    }
    if (notificationPreferences && typeof notificationPreferences === 'object') {
      updates.notificationPreferences = notificationPreferences;
    }
    if (profileVisibility && ['PUBLIC', 'TEAM', 'PRIVATE'].includes(profileVisibility)) {
      updates.profileVisibility = profileVisibility;
    }

    // Password change verification
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 });
      }
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }

      const isMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Current password does not match' }, { status: 400 });
      }

      updates.passwordHash = bcrypt.hashSync(newPassword, 10);
    }

    const updatedUser = await db.updateUserProfile(user.id, updates);
    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    await db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PROFILE_UPDATED',
      entity: 'USER',
      entityId: user.id,
      newValue: JSON.stringify({
        name: updates.name,
        phone: updates.phone,
        designation: updates.designation,
        avatar: updates.avatar,
        passwordChanged: Boolean(newPassword),
        languagePreference: updates.languagePreference,
        themePreference: updates.themePreference,
      }),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        designation: updatedUser.designation,
        role: updatedUser.role,
        vehicle: updatedUser.vehicle,
        avatar: updatedUser.avatar,
        active: updatedUser.active,
        languagePreference: updatedUser.languagePreference,
        themePreference: updatedUser.themePreference,
        notificationPreferences: updatedUser.notificationPreferences,
        profileVisibility: updatedUser.profileVisibility,
        createdAt: updatedUser.createdAt,
      },
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}

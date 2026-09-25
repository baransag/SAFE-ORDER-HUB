export function getUserAvatar(user?: { name?: string; email?: string; avatar?: string; role?: string } | null): string {
  if (!user) return '';

  if (user.avatar && user.avatar.trim().length > 0) {
    // Normalise any path typo
    return user.avatar.replace('/assest/', '/assets/');
  }

  const name = (user.name || '').toLowerCase();
  const email = (user.email || '').toLowerCase();

  if (name.includes('asif') || email.includes('boss')) {
    return '/assets/images/Asif.jpeg';
  }
  if (name.includes('husnain') || email.includes('baransag')) {
    return '/assets/images/Husnain.jpeg';
  }
  if (name.includes('samaira') || name.includes('samira') || email.includes('sm.bajwa')) {
    return '/assets/images/Samira.jpeg';
  }
  if (name.includes('shahzaib') || email.includes('zaiberana')) {
    return '/assets/images/shahzaib-ahmad.jpeg';
  }
  if (name.includes('shahbaz') || email.includes('shabazbutt')) {
    return '/assets/images/shahbaz-ahmad.jpeg';
  }
  if (name.includes('adnan') || email.includes('mianadnan')) {
    return '/assets/images/adnan-ali.jpeg';
  }
  if (name.includes('haseeb') || email.includes('haseebali')) {
    return '/assets/images/haseeb-ali.jpeg';
  }
  if (name.includes('tajammul') || email.includes('tajammulbajwa')) {
    return '/assets/images/tajammul.jpeg';
  }

  return '';
}

export function getUserInitials(name?: string): string {
  if (!name) return 'SO';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

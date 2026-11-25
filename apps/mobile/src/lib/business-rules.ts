export type BackendAction =
  | 'create-purchase'
  | 'redeem-purchase'
  | 'redeem-reward'
  | 'use-reward';

export type AuthAction = 'sign-in' | 'sign-up';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeUuid(value: string): string | null {
  const normalized = value.trim();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

export function parsePurchaseAmount(value: string): number | null {
  const normalized = value.trim().replace(',', '.');

  if (!normalized) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function getAuthErrorMessage(
  action: AuthAction,
  backendMessage: string
): string {
  const normalized = backendMessage.toLowerCase();

  if (normalized.includes('fetch') || normalized.includes('network')) {
    return 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.';
  }

  if (action === 'sign-up') {
    if (normalized.includes('password')) {
      return 'La contraseña no cumple los requisitos de seguridad.';
    }
    if (normalized.includes('email') && normalized.includes('invalid')) {
      return 'Ingresa un correo electrónico válido.';
    }
    return 'No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.';
  }

  return 'No se pudo iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.';
}

export function getBackendErrorMessage(
  action: BackendAction,
  backendMessage: string
): string {
  if (backendMessage.includes('Not authorized')) {
    return 'No tienes permisos de empleado.';
  }

  if (action === 'redeem-purchase') {
    if (backendMessage.includes('already redeemed')) {
      return 'Este QR ya fue utilizado.';
    }
    if (backendMessage.includes('expired')) {
      return 'Este QR ha expirado.';
    }
    if (
      backendMessage.includes('Invalid QR') ||
      backendMessage.includes('invalid input syntax for type uuid')
    ) {
      return 'Este código QR no es válido.';
    }
  }

  if (action === 'redeem-reward') {
    if (backendMessage.includes('Not enough points')) {
      return 'No tienes suficientes puntos.';
    }
    if (backendMessage.includes('Reward not available')) {
      return 'Este premio ya no está disponible.';
    }
  }

  if (action === 'use-reward') {
    if (backendMessage.includes('already used')) {
      return 'Este premio ya fue utilizado.';
    }
    if (backendMessage.includes('cancelled')) {
      return 'Este premio fue cancelado.';
    }
    if (
      backendMessage.includes('not found') ||
      backendMessage.includes('not available') ||
      backendMessage.includes('invalid input syntax for type uuid')
    ) {
      return 'El código del premio no es válido.';
    }
  }

  if (action === 'create-purchase') {
    if (backendMessage.includes('Invalid purchase amount')) {
      return 'El monto de compra no es válido.';
    }
    if (backendMessage.includes('Purchase does not generate points')) {
      return 'Este monto no genera puntos.';
    }
    if (backendMessage.includes('Loyalty settings not found')) {
      return 'La configuración de puntos no está disponible.';
    }
  }

  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

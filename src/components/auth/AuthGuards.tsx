import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ConditionalAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface RoleBasedProps extends ConditionalAuthProps {
  requiredRole?: string;
  requiredRoles?: string[];
  allowedRoles?: string[];
}

/**
 * Renders children only if user is authenticated
 */
export function IfAuthenticated({ children, fallback = null }: ConditionalAuthProps) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user is NOT authenticated
 */
export function IfNotAuthenticated({ children, fallback = null }: ConditionalAuthProps) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user has the required role(s)
 */
export function IfHasRole({ 
  children, 
  fallback = null, 
  requiredRole, 
  requiredRoles,
  allowedRoles 
}: RoleBasedProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  const userRole = user.role;
  let hasAccess = false;

  if (requiredRole) {
    hasAccess = userRole === requiredRole;
  } else if (requiredRoles && requiredRoles.length > 0) {
    hasAccess = requiredRoles.includes(userRole || '');
  } else if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = allowedRoles.includes(userRole || '');
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user does NOT have the specified role(s)
 */
export function IfNotHasRole({ 
  children, 
  fallback = null, 
  requiredRole, 
  requiredRoles,
  allowedRoles 
}: RoleBasedProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  const userRole = user.role;
  let hasRole = false;

  if (requiredRole) {
    hasRole = userRole === requiredRole;
  } else if (requiredRoles && requiredRoles.length > 0) {
    hasRole = requiredRoles.includes(userRole || '');
  } else if (allowedRoles && allowedRoles.length > 0) {
    hasRole = allowedRoles.includes(userRole || '');
  }

  return !hasRole ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user is an admin
 */
export function IfAdmin({ children, fallback = null }: ConditionalAuthProps) {
  return (
    <IfHasRole requiredRole="admin" fallback={fallback}>
      {children}
    </IfHasRole>
  );
}

/**
 * Renders children only if user is NOT an admin
 */
export function IfNotAdmin({ children, fallback = null }: ConditionalAuthProps) {
  return (
    <IfNotHasRole requiredRole="admin" fallback={fallback}>
      {children}
    </IfNotHasRole>
  );
}

/**
 * Renders children only if user is a moderator or admin
 */
export function IfModerator({ children, fallback = null }: ConditionalAuthProps) {
  return (
    <IfHasRole allowedRoles={['moderator', 'admin']} fallback={fallback}>
      {children}
    </IfHasRole>
  );
}

/**
 * Renders children only if the current user owns the resource
 */
export function IfOwner({ 
  children, 
  fallback = null, 
  ownerId 
}: ConditionalAuthProps & { ownerId: string }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  const isOwner = user.id === ownerId;
  return isOwner ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user owns the resource OR has admin/moderator role
 */
export function IfOwnerOrAdmin({ 
  children, 
  fallback = null, 
  ownerId 
}: ConditionalAuthProps & { ownerId: string }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  const isOwner = user.id === ownerId;
  const isAdminOrModerator = ['admin', 'moderator'].includes(user.role || '');
  
  return (isOwner || isAdminOrModerator) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Custom hook for auth-based conditional logic
 */
export function useAuthGuards() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    user,
    isAdmin: user?.role === 'admin',
    isModerator: user?.role === 'moderator' || user?.role === 'admin',
    hasRole: (role: string) => user?.role === role,
    hasAnyRole: (roles: string[]) => user?.role && roles.includes(user.role),
    isOwner: (ownerId: string) => user?.id === ownerId,
    isOwnerOrAdmin: (ownerId: string) => 
      user?.id === ownerId || ['admin', 'moderator'].includes(user?.role || ''),
  };
} 
import { describe, it, expect } from 'vitest';
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  checkUserPermission,
  resolveEffectivePermissions,
} from './permissions';

describe('permissions matrix & overrides', () => {
  it('always grants all permissions to admin regardless of overrides', () => {
    const resolved = resolveEffectivePermissions(
      'admin',
      { 'finance.view': false, 'settings.manage': false },
      { 'scrap.view': false },
    );

    for (const key of ALL_PERMISSION_KEYS) {
      expect(resolved[key]).toBe(true);
    }
    expect(
      checkUserPermission({ role: 'admin', permissions: { 'finance.view': false } }, 'finance.view'),
    ).toBe(true);
  });

  it('merges role permissions and per-user custom permissions for non-admin roles', () => {
    const resolved = resolveEffectivePermissions(
      'warehouse_manager',
      { 'finance.view': true },
      { 'contacts.manage': false },
    );

    expect(resolved['finance.view']).toBe(true);
    expect(resolved['contacts.manage']).toBe(false);
    expect(resolved['scrap.edit_delete']).toBe(true);
    expect(resolved['settings.manage']).toBe(false);
  });

  it('prevents non-admin roles from acquiring settings.manage', () => {
    const resolved = resolveEffectivePermissions(
      'manager',
      { 'settings.manage': true },
      { 'settings.manage': true },
    );
    expect(resolved['settings.manage']).toBe(false);
  });

  it('falls back to DEFAULT_ROLE_PERMISSIONS when user.permissions is undefined', () => {
    expect(checkUserPermission({ role: 'accountant' }, 'finance.record_payment')).toBe(
      DEFAULT_ROLE_PERMISSIONS.accountant['finance.record_payment'],
    );
    expect(checkUserPermission({ role: 'accountant' }, 'scrap.view')).toBe(true);
    expect(checkUserPermission({ role: 'accountant' }, 'scrap.create')).toBe(false);
    expect(checkUserPermission({ role: 'staff' }, 'contacts.manage')).toBe(true);
    expect(checkUserPermission(null, 'scrap.view')).toBe(false);
  });
});

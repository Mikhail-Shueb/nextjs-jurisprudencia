import { hashPassword, compare, sha256, readUser, createUser, updateUser, deleteUser, listUsers } from '../usercrud';
import { roleCanAccess } from '../roles';

describe('User Authentication & Cryptography', () => {
  describe('SHA256 & Password Hashing', () => {
    it('generates deterministic SHA-256 hashes', () => {
      const hash1 = sha256('testpassword');
      const hash2 = sha256('testpassword');
      const hashDiff = sha256('different');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hashDiff);
      expect(hash1).toHaveLength(64); // hex string length
    });

    it('combines salt and password properly', () => {
      const salt = 'testsalt12345678';
      const password = 'mysecretpass';
      const hash = hashPassword(salt, password);

      expect(hash).toBe(sha256(salt + password));
    });

    it('validates matching hashes using constant-time comparison', () => {
      const salt = 'randomsalt123456';
      const password = 'correctpassword';
      const validHash = hashPassword(salt, password);

      expect(compare(validHash, validHash)).toBe(true);
      expect(compare(validHash, hashPassword(salt, 'wrongpassword'))).toBe(false);
      expect(compare('', validHash)).toBe(false);
      expect(compare(validHash, '')).toBe(false);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('allows admin users to access all features', () => {
      expect(roleCanAccess('admin', 'manageUsers')).toBe(true);
      expect(roleCanAccess('admin', 'importExport')).toBe(true);
      expect(roleCanAccess('admin', 'filters')).toBe(true);
      expect(roleCanAccess('admin', 'bypassCanonical')).toBe(true);
    });

    it('restricts editor users from administrative features', () => {
      expect(roleCanAccess('editor', 'manageUsers')).toBe(false);
      expect(roleCanAccess('editor', 'importExport')).toBe(false);
      expect(roleCanAccess('editor', 'filters')).toBe(false);
    });
  });

  describe('In-Memory User Operations', () => {
    it('reads default in-memory admin user', async () => {
      const user = await readUser('admin');
      expect(user).not.toBeNull();
      expect(user?._source.username).toBe('admin');
      expect(user?._source.role).toBe('admin');
    });

    it('reads default in-memory editor user', async () => {
      const user = await readUser('editor');
      expect(user).not.toBeNull();
      expect(user?._source.username).toBe('editor');
      expect(user?._source.role).toBe('editor');
    });

    it('returns null for non-existent users', async () => {
      const user = await readUser('non_existent_user_999');
      expect(user).toBeNull();
    });

    it('creates, reads, updates and deletes a new user', async () => {
      const testUsername = 'temp_test_user';
      const testPassword = 'initialPassword123';
      const updatedPassword = 'newPassword456';

      // 1. Create
      const created = await createUser(testUsername, testPassword, 'editor');
      expect(created).toBe(true);

      // Cannot create duplicate
      const duplicate = await createUser(testUsername, testPassword, 'editor');
      expect(duplicate).toBe(false);

      // 2. Read
      const user = await readUser(testUsername);
      expect(user).not.toBeNull();
      expect(user?._source.username).toBe(testUsername);
      expect(user?._source.role).toBe('editor');

      // Verify password hash
      const isPasswordValid = compare(user!._source.hash, hashPassword(user!._source.salt, testPassword));
      expect(isPasswordValid).toBe(true);

      // 3. Update
      const updated = await updateUser(testUsername, updatedPassword);
      expect(updated).toBe(true);

      const userAfterUpdate = await readUser(testUsername);
      const isNewPasswordValid = compare(userAfterUpdate!._source.hash, hashPassword(userAfterUpdate!._source.salt, updatedPassword));
      expect(isNewPasswordValid).toBe(true);

      // 4. Delete
      const deleted = await deleteUser(testUsername);
      expect(deleted).toBe(true);

      const userAfterDelete = await readUser(testUsername);
      expect(userAfterDelete).toBeNull();
    });

    it('lists users including defaults', async () => {
      const list = await listUsers();
      expect(list.hits.hits.length).toBeGreaterThanOrEqual(2);
      const usernames = list.hits.hits.map((h: any) => h._source.username);
      expect(usernames).toContain('admin');
      expect(usernames).toContain('editor');
    });
  });
});

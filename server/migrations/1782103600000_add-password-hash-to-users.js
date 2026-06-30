/* Migration: Add Password Hash to Users
   Description: Adds password_hash column to support local authentication for bulk imported users.
*/

export const up = (pgm) => {
  pgm.addColumn('users', {
    password_hash: { type: 'varchar(255)' },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('users', 'password_hash');
};

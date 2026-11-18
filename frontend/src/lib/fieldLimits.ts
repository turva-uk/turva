/**
 * The most characters a field takes, so nobody can type past the limit and
 * be stopped only after pressing save.
 *
 * Each limit names the Django field it matches. Change one and change the
 * other.
 */

/** An email address: `User.email` in `app/accounts/models.py`, 254 wide. */
export const MAX_EMAIL = 254;

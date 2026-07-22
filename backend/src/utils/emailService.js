/**
 * Dev Adapter & Logger Email Verification Service
 */
export const sendVerificationEmail = async ({ email, name, token, reqHost }) => {
  const host = reqHost || 'http://localhost:5000';
  const verificationLink = `${host}/api/auth/verify?token=${token}`;

  console.log('\n=============================================================');
  console.log(' 📩 VERIFICATION EMAIL SENT (DEV LOG ADAPTER)');
  console.log('=============================================================');
  console.log(` To: ${name} <${email}>`);
  console.log(` Subject: Verify your Community Portal Account`);
  console.log(` Verification Link: ${verificationLink}`);
  console.log('=============================================================\n');

  return {
    success: true,
    verificationLink,
    message: 'Verification email dispatched successfully (logged to server console)',
  };
};

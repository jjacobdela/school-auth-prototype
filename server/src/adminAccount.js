const bcrypt = require("bcrypt");
const User = require("./models/User");

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin";
const ADMIN_FULL_NAME = "Admin";

async function ensureAdminAccount() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      fullName: ADMIN_FULL_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
      status: "Active"
    },
    {
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  console.log('Admin login ready: username "admin", password "admin"');
}

module.exports = { ensureAdminAccount };

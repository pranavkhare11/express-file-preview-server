const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    hashedPassword: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seedAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
        console.error("  ⚠️ [ADMIN SEEDING FAILED] ADMIN_EMAIL or ADMIN_PASSWORD not found in environment variables");
        return;
    }
    console.log(`  ⚙️ [SEEDING ADMIN] Starting…`);
    console.log(`  ⚙️ [SEEDING ADMIN] ADMIN_EMAIL=${adminEmail}`);
    console.log(`  ⚙️ [SEEDING ADMIN] ADMIN_PASSWORD=${adminPassword}`);

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        await User.create({
            name: "System Admin",
            email: adminEmail,
            hashedPassword,
            role: "admin"
        });
        console.log(`  🛡️ [ADMIN SEEDED] Default admin created: ${adminEmail} / ${process.env.ADMIN_PASSWORD}`);
    }
}

module.exports = {
    User,
    seedAdmin
};

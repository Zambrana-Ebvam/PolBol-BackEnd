require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un admin
    const existingAdmin = await User.findOne({ role: 'ADMIN' });
    if (existingAdmin) {
      console.log('⚠️  Ya existe un usuario ADMIN en el sistema');
      console.log(`👤 Nombre: ${existingAdmin.fullName}`);
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`📞 Teléfono: ${existingAdmin.phoneNumber}`);
      console.log(`🎯 Badge: ${existingAdmin.badgeNumber}`);
      console.log(`🔑 Para resetear contraseña, use el endpoint de cambio de contraseña`);
      process.exit(0);
    }

    // Crear usuario admin
    const adminUser = new User({
      fullName: 'Administrador del Sistema',
      role: 'ADMIN',
      phoneNumber: '+59161234567',
      email: 'admin@sistemaemergencias.com',
      badgeNumber: 'ADMIN001',
      rank: 'GENERAL_SUPERIOR',
      unit: 'Comando General',
      password: 'admin123', // Se hasheará automáticamente
      permissions: [
        'VIEW_INCIDENTS',
        'MANAGE_INCIDENTS', 
        'ASSIGN_OFFICERS',
        'MANAGE_USERS',
        'VIEW_REPORTS',
        'MANAGE_EMERGENCY_TYPES',
        'ACCESS_MAP',
        'MANAGE_SYSTEM'
      ]
    });

    await adminUser.save();
    console.log('🎉 USUARIO ADMIN CREADO EXITOSAMENTE');
    console.log('════════════════════════════════════════');
    console.log('📋 CREDENCIALES DE ACCESO:');
    console.log(`   👤 Nombre: ${adminUser.fullName}`);
    console.log(`   📧 Email: ${adminUser.email}`);
    console.log(`   📞 Teléfono: ${adminUser.phoneNumber}`);
    console.log(`   🎯 Badge: ${adminUser.badgeNumber}`);
    console.log(`   🔑 Contraseña: admin123`);
    console.log('════════════════════════════════════════');
    console.log('⚠️  IMPORTANTE: Cambie la contraseña después del primer login');
    console.log('💡 Use: POST /api/auth/change-password con su token JWT');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error);
    process.exit(1);
  }
};

// Solo ejecutar si se llama directamente
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;
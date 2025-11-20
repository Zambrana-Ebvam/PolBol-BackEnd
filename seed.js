require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Location = require('./models/Location');
const EmergencyType = require('./models/EmergencyType');

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to', MONGO_URI);
  
  // Limpiar datos existentes
  await User.deleteMany({});
  await Location.deleteMany({});
  await EmergencyType.deleteMany({});
  
  // Crear tipos de emergencia
  const emergencyTypes = await EmergencyType.create([
    { code: 'ROB', name: 'Robo', priority: 3, responseTime: 10, color: '#FF6B00' },
    { code: 'ACC', name: 'Accidente de Tránsito', priority: 4, responseTime: 5, color: '#FF0000' },
    { code: 'ASL', name: 'Asalto', priority: 4, responseTime: 5, color: '#CC0000' },
    { code: 'INC', name: 'Incendio', priority: 4, responseTime: 5, color: '#FF3300' },
    { code: 'SAU', name: 'Salud Urgente', priority: 4, responseTime: 5, color: '#FF0000' },
    { code: 'DIS', name: 'Disturbio', priority: 3, responseTime: 10, color: '#FF9900' },
    { code: 'VAN', name: 'Vandalismo', priority: 2, responseTime: 15, color: '#FFCC00' },
    { code: 'OTR', name: 'Otro', priority: 1, responseTime: 20, color: '#999999' }
  ]);
  
  // Crear usuarios civiles
  const civil1 = await User.create({ 
    fullName: 'María González', 
    role: 'CIVIL', 
    phoneNumber: '+59170000001',
    identityCard: '1234567'
  });
  
  const civil2 = await User.create({ 
    fullName: 'Carlos Rodríguez', 
    role: 'CIVIL', 
    phoneNumber: '+59170000002',
    identityCard: '7654321'
  });
  
  // Crear oficiales
  const officer1 = await User.create({ 
    fullName: 'Teniente Juan Pérez', 
    role: 'OFFICER', 
    phoneNumber: '+59171111111',
    badgeNumber: 'OF-001',
    rank: 'TENIENTE',
    unit: 'Comisaría Central'
  });
  
  const officer2 = await User.create({ 
    fullName: 'Oficial Ana Martínez', 
    role: 'OFFICER', 
    phoneNumber: '+59172222222',
    badgeNumber: 'OF-002',
    rank: 'OFICIAL',
    unit: 'Patrulla Móvil'
  });
  
  const officer3 = await User.create({ 
    fullName: 'Capitán Roberto Silva', 
    role: 'OFFICER', 
    phoneNumber: '+59173333333',
    badgeNumber: 'OF-003',
    rank: 'CAPITAN',
    unit: 'Comandancia'
  });
  
  // Crear operador
  const operator = await User.create({ 
    fullName: 'Operadora Laura Torres', 
    role: 'OPERATOR', 
    phoneNumber: '+59174444444',
    badgeNumber: 'OP-001'
  });
  
  // Crear ubicaciones para oficiales
  await Location.create([
    { 
      userId: officer1._id, 
      coords: { type: 'Point', coordinates: [-68.1193, -16.4897] }, 
      accuracyM: 5 
    },
    { 
      userId: officer2._id, 
      coords: { type: 'Point', coordinates: [-68.1200, -16.4900] }, 
      accuracyM: 8 
    },
    { 
      userId: officer3._id, 
      coords: { type: 'Point', coordinates: [-68.1180, -16.4880] }, 
      accuracyM: 12 
    }
  ]);
  
  console.log('Seed completed successfully!');
  console.log('Emergency Types:', emergencyTypes.length);
  console.log('Civil Users:', 2);
  console.log('Officers:', 3);
  console.log('Operator:', 1);
  
  console.log('\nSample IDs for testing:');
  console.log('Civil 1:', civil1._id.toString());
  console.log('Officer 1:', officer1._id.toString());
  console.log('Operator:', operator._id.toString());
  
  process.exit(0);
}

run().catch(e => {
  console.error('Seed error:', e);
  process.exit(1);
});
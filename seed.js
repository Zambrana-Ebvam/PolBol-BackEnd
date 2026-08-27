require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Location = require("./models/Location");
const Incident = require("./models/Incident");
const { USER_ROLES, INCIDENT_STATUS, EMERGENCY_TYPES } = require("./constants/emergencyTypes");

const MONGO_URI = process.env.MONGO_URI;

async function resetAndSeedDatabase() {
  if (!MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI no está configurada en .env");
    process.exit(1);
  }

  try {
    console.log("🔌 Conectando a MongoDB Atlas...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Conexión establecida.");

    console.log("🗑️  Borrando colecciones existentes para iniciar desde cero...");
    await User.deleteMany({});
    await Location.deleteMany({});
    await Incident.deleteMany({});
    console.log("✨ Base de datos completamente limpia.");

    // Sincronizar índices
    await User.syncIndexes();
    await Location.syncIndexes();
    await Incident.syncIndexes();
    console.log("📌 Índices geoespaciales y únicos sincronizados correctamente.");

    // =========================================================================
    // 1. CIUDADANOS (CIVIL)
    // =========================================================================
    console.log("👤 Creando usuarios Civiles...");
    const civil1 = new User({
      firstName: "Carlos",
      lastName: "Mendoza",
      role: USER_ROLES.CIVIL,
      email: "civil@test.com",
      phoneNumber: "+59170123456",
      ci: "1234567LP",
      birthDate: new Date("1998-03-15"),
    });
    await civil1.setPassword("123456");
    await civil1.save();

    const civil2 = new User({
      firstName: "María",
      lastName: "Quispe",
      role: USER_ROLES.CIVIL,
      email: "maria@test.com",
      phoneNumber: "+59170234567",
      ci: "2345678LP",
      birthDate: new Date("1995-09-22"),
    });
    await civil2.setPassword("123456");
    await civil2.save();

    const civil3 = new User({
      firstName: "Juan",
      lastName: "Pérez",
      role: USER_ROLES.CIVIL,
      email: "juan@test.com",
      phoneNumber: "+59170345678",
      ci: "3456789CB",
      birthDate: new Date("2000-12-05"),
    });
    await civil3.setPassword("123456");
    await civil3.save();

    // Ubicaciones de Civiles
    await Location.create([
      {
        userId: civil1._id,
        coords: { type: "Point", coordinates: [-68.1305, -16.5085] }, // Plaza Abaroa, Sopocachi
        accuracyM: 5,
        updatedAt: new Date(),
      },
      {
        userId: civil2._id,
        coords: { type: "Point", coordinates: [-68.1338, -16.5020] }, // El Prado
        accuracyM: 4,
        updatedAt: new Date(),
      },
      {
        userId: civil3._id,
        coords: { type: "Point", coordinates: [-68.1332, -16.4957] }, // Plaza Murillo
        accuracyM: 6,
        updatedAt: new Date(),
      },
    ]);

    // =========================================================================
    // 2. OFICIALES DE POLICÍA (OFFICER)
    // =========================================================================
    console.log("👮 Creando Oficiales de Policía...");
    const officer1 = new User({
      firstName: "Ramiro",
      lastName: "Mamani",
      role: USER_ROLES.OFFICER,
      email: "officer@test.com",
      phoneNumber: "+59171122334",
      ci: "7654321LP",
      birthDate: new Date("1992-07-20"),
      policeRank: "SARGENTO_PRIMERO",
      escalafon: "POL1001",
      isAvailable: true,
    });
    await officer1.setPassword("123456");
    await officer1.save();

    const officer2 = new User({
      firstName: "Alejandro",
      lastName: "Flores",
      role: USER_ROLES.OFFICER,
      email: "teniente@test.com",
      phoneNumber: "+59172233445",
      ci: "8877665SC",
      birthDate: new Date("1989-11-10"),
      policeRank: "TENIENTE",
      escalafon: "POL2002",
      isAvailable: true,
    });
    await officer2.setPassword("123456");
    await officer2.save();

    const officer3 = new User({
      firstName: "Roberto",
      lastName: "Vaca",
      role: USER_ROLES.OFFICER,
      email: "capitan@test.com",
      phoneNumber: "+59173344556",
      ci: "6655443CB",
      birthDate: new Date("1984-04-18"),
      policeRank: "CAPITAN",
      escalafon: "POL3003",
      isAvailable: true,
    });
    await officer3.setPassword("123456");
    await officer3.save();

    const officer4 = new User({
      firstName: "Sonia",
      lastName: "Torrico",
      role: USER_ROLES.OFFICER,
      email: "sargento@test.com",
      phoneNumber: "+59174455667",
      ci: "4433221OR",
      birthDate: new Date("1996-08-30"),
      policeRank: "SARGENTO_SEGUNDO",
      escalafon: "POL4004",
      isAvailable: true,
    });
    await officer4.setPassword("123456");
    await officer4.save();

    const officer5 = new User({
      firstName: "Diego",
      lastName: "Alarcón",
      role: USER_ROLES.OFFICER,
      email: "voluntario@test.com",
      phoneNumber: "+59175566778",
      ci: "3322110PT",
      birthDate: new Date("2001-01-14"),
      policeRank: "GACIP - Voluntario",
      escalafon: "GAC5005",
      isAvailable: false, // No disponible
    });
    await officer5.setPassword("123456");
    await officer5.save();

    // Ubicaciones de los Oficiales (Patrullas distribuidas en La Paz)
    await Location.create([
      {
        userId: officer1._id,
        coords: { type: "Point", coordinates: [-68.1285, -16.5090] }, // Patrulla Sopocachi
        accuracyM: 3,
        updatedAt: new Date(),
      },
      {
        userId: officer2._id,
        coords: { type: "Point", coordinates: [-68.1345, -16.5015] }, // Patrulla Centro / Prado
        accuracyM: 4,
        updatedAt: new Date(),
      },
      {
        userId: officer3._id,
        coords: { type: "Point", coordinates: [-68.1220, -16.5005] }, // Patrulla Miraflores / Estadio
        accuracyM: 3,
        updatedAt: new Date(),
      },
      {
        userId: officer4._id,
        coords: { type: "Point", coordinates: [-68.1375, -16.5035] }, // Patrulla San Pedro
        accuracyM: 5,
        updatedAt: new Date(),
      },
      {
        userId: officer5._id,
        coords: { type: "Point", coordinates: [-68.0890, -16.5410] }, // Calacoto / Zona Sur
        accuracyM: 5,
        updatedAt: new Date(),
      },
    ]);

    // =========================================================================
    // 3. OPERADOR DE CENTRAL (OPERATOR)
    // =========================================================================
    console.log("🖥️ Creando Operador de Central...");
    const operator = new User({
      firstName: "Patricia",
      lastName: "Condori",
      role: USER_ROLES.OPERATOR,
      email: "operator@test.com",
      phoneNumber: "+59179988776",
      ci: "9988776CB",
      birthDate: new Date("1995-05-25"),
    });
    await operator.setPassword("123456");
    await operator.save();

    // =========================================================================
    // 4. ADMINISTRADOR (ADMIN)
    // =========================================================================
    console.log("👑 Creando Administrador...");
    const admin = new User({
      firstName: "Admin",
      lastName: "General",
      role: USER_ROLES.ADMIN,
      email: "admin@test.com",
      phoneNumber: "+59177700112",
      ci: "5554443OR",
      birthDate: new Date("1985-01-01"),
    });
    await admin.setPassword("admin123");
    await admin.save();

    // =========================================================================
    // 5. INCIDENTES DE DEMOSTRACIÓN (EN DISTINTOS ESTADOS)
    // =========================================================================
    console.log("🚨 Creando Incidentes de demostración en varios estados...");

    // Incidente A: OPEN (Abierto por Civil 1)
    const incOpen = await Incident.create({
      requesterId: civil1._id,
      emergencyTypeCode: "ROBO",
      initialLocation: {
        type: "Point",
        coordinates: [-68.1310, -16.5080], // Sopocachi
      },
      details: {
        description: "Robo de teléfono móvil en parada de autobús",
        urgency: "HIGH",
        suspects: "Dos personas con ropa oscura",
      },
      priority: 1,
      status: INCIDENT_STATUS.OPEN,
      timeline: [
        {
          status: INCIDENT_STATUS.OPEN,
          updatedBy: civil1._id,
          note: "Incidente reportado por el ciudadano desde la app móvil.",
          timestamp: new Date(Date.now() - 10 * 60 * 1000), // hace 10 minutos
        },
      ],
    });

    // Incidente B: ASSIGNED (Asignado al Teniente)
    const incAssigned = await Incident.create({
      requesterId: civil2._id,
      emergencyTypeCode: "ACCIDENTE",
      initialLocation: {
        type: "Point",
        coordinates: [-68.1340, -16.5025], // El Prado
      },
      details: {
        description: "Colisión entre vehículo particular y minibús",
        urgency: "MEDIUM",
        injuries: "Sin heridos graves",
      },
      priority: 2,
      status: INCIDENT_STATUS.ASSIGNED,
      assignedOfficerId: officer2._id,
      assignees: [
        {
          officerId: officer2._id,
          assignedAt: new Date(Date.now() - 5 * 60 * 1000),
        },
      ],
      timeline: [
        {
          status: INCIDENT_STATUS.OPEN,
          updatedBy: civil2._id,
          note: "Ciudadano reporta accidente de tránsito.",
          timestamp: new Date(Date.now() - 8 * 60 * 1000),
        },
        {
          status: INCIDENT_STATUS.ASSIGNED,
          updatedBy: operator._id,
          note: `Operador asignó al Oficial ${officer2.policeRank} ${officer2.firstName} ${officer2.lastName}.`,
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
        },
      ],
    });

    // Incidente C: IN_PROGRESS (Oficial 1 aceptó y está en camino)
    const incInProgress = await Incident.create({
      requesterId: civil3._id,
      emergencyTypeCode: "VIOLENCIA",
      initialLocation: {
        type: "Point",
        coordinates: [-68.1330, -16.4960], // Plaza Murillo
      },
      details: {
        description: "Disturbios y riña en vía pública",
        urgency: "HIGH",
      },
      priority: 1,
      status: INCIDENT_STATUS.IN_PROGRESS,
      assignedOfficerId: officer1._id,
      assignees: [
        {
          officerId: officer1._id,
          assignedAt: new Date(Date.now() - 15 * 60 * 1000),
          acceptedAt: new Date(Date.now() - 12 * 60 * 1000),
          arrivedAt: new Date(Date.now() - 2 * 60 * 1000),
        },
      ],
      timeline: [
        {
          status: INCIDENT_STATUS.OPEN,
          updatedBy: civil3._id,
          note: "Reporte de disturbios en la plaza.",
          timestamp: new Date(Date.now() - 18 * 60 * 1000),
        },
        {
          status: INCIDENT_STATUS.ASSIGNED,
          updatedBy: operator._id,
          note: `Despachado a ${officer1.policeRank} ${officer1.firstName} ${officer1.lastName}.`,
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
        },
        {
          status: INCIDENT_STATUS.IN_PROGRESS,
          updatedBy: officer1._id,
          note: "Oficial aceptó el incidente y se desplazó al lugar.",
          timestamp: new Date(Date.now() - 12 * 60 * 1000),
        },
        {
          status: INCIDENT_STATUS.IN_PROGRESS,
          updatedBy: officer1._id,
          note: "Oficial arribó al punto de emergencia.",
          timestamp: new Date(Date.now() - 2 * 60 * 1000),
        },
      ],
    });

    // Incidente D: RESOLVED (Resuelto y archivado)
    const incResolved = await Incident.create({
      requesterId: civil1._id,
      emergencyTypeCode: "SALUD",
      initialLocation: {
        type: "Point",
        coordinates: [-68.1215, -16.5010], // Miraflores
      },
      details: {
        description: "Persona desmayada en acera peatonal",
        urgency: "HIGH",
      },
      priority: 1,
      status: INCIDENT_STATUS.RESOLVED,
      assignedOfficerId: officer4._id,
      assignees: [
        {
          officerId: officer4._id,
          assignedAt: new Date(Date.now() - 60 * 60 * 1000),
          acceptedAt: new Date(Date.now() - 55 * 60 * 1000),
          arrivedAt: new Date(Date.now() - 40 * 60 * 1000),
          closedAt: new Date(Date.now() - 10 * 60 * 1000),
        },
      ],
      timeline: [
        {
          status: INCIDENT_STATUS.OPEN,
          updatedBy: civil1._id,
          note: "Emergencia médica reportada.",
          timestamp: new Date(Date.now() - 65 * 60 * 1000),
        },
        {
          status: INCIDENT_STATUS.ASSIGNED,
          updatedBy: operator._id,
          note: "Asignado a patrulla médica de asistencia.",
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
        },
        {
          status: INCIDENT_STATUS.IN_PROGRESS,
          updatedBy: officer4._id,
          note: "En camino al lugar.",
          timestamp: new Date(Date.now() - 55 * 60 * 1000),
        },
        {
          status: INCIDENT_STATUS.RESOLVED,
          updatedBy: officer4._id,
          note: "Paciente estabilizado y trasladado al Hospital de Clínicas.",
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
        },
      ],
    });

    console.log("\n======================================================================");
    console.log("🎉 ¡BASE DE DATOS CREADA Y POBLADA EXITOSAMENTE DESDE CERO!");
    console.log("======================================================================");
    console.log("📋 USUARIOS CREADOS PARA TU DEFENSA:");
    console.log("----------------------------------------------------------------------");
    console.log("👤 CIVILES:");
    console.log("  • civil@test.com     | Pass: 123456 | Carlos Mendoza (Sopocachi)");
    console.log("  • maria@test.com     | Pass: 123456 | María Quispe (El Prado)");
    console.log("  • juan@test.com      | Pass: 123456 | Juan Pérez (Centro)");
    console.log("");
    console.log("👮 OFICIALES DE POLICÍA:");
    console.log("  • officer@test.com   | Pass: 123456 | Sargento 1ro Ramiro Mamani [POL1001]");
    console.log("  • teniente@test.com  | Pass: 123456 | Teniente Alejandro Flores [POL2002]");
    console.log("  • capitan@test.com   | Pass: 123456 | Capitán Roberto Vaca [POL3003]");
    console.log("  • sargento@test.com  | Pass: 123456 | Sargento 2do Sonia Torrico [POL4004]");
    console.log("  • voluntario@test.com| Pass: 123456 | GACIP Diego Alarcón [GAC5005] (No disp.)");
    console.log("");
    console.log("🖥️ OPERADOR DE CENTRAL:");
    console.log("  • operator@test.com  | Pass: 123456 | Patricia Condori");
    console.log("");
    console.log("👑 ADMINISTRADOR:");
    console.log("  • admin@test.com     | Pass: admin123 | Admin General");
    console.log("----------------------------------------------------------------------");
    console.log("🚨 INCIDENTES DE EJEMPLO:");
    console.log(`  • [OPEN]        ID: ${incOpen._id} (Robo - Sopocachi)`);
    console.log(`  • [ASSIGNED]    ID: ${incAssigned._id} (Accidente - Prado)`);
    console.log(`  • [IN_PROGRESS] ID: ${incInProgress._id} (Violencia - Murillo)`);
    console.log(`  • [RESOLVED]    ID: ${incResolved._id} (Salud - Miraflores)`);
    console.log("======================================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error al poblar la base de datos:", error);
    process.exit(1);
  }
}

resetAndSeedDatabase();

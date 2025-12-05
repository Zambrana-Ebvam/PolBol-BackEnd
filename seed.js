require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Location = require("./models/Location");

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("connected to", MONGO_URI);

  // Limpiar colecciones necesarias
  await User.deleteMany({});
  await Location.deleteMany({});

  // ---------------------------------------------------------------------
  // 👤 1. Crear usuario CIVIL
  // ---------------------------------------------------------------------
  const civil = new User({
    firstName: "Usuario",
    lastName: "Civil",
    role: "CIVIL",
    email: "civil@test.com",
    phoneNumber: "+59170000000",
    ci: "1234567LP",
    birthDate: new Date("2000-03-20")
  });
  await civil.setPassword("123456");
  await civil.save();

  // ---------------------------------------------------------------------
  // 👮‍♂️ 2. Crear usuario OFFICER
  // ---------------------------------------------------------------------
  const officer = new User({
    firstName: "Oficial",
    lastName: "Ejemplo",
    role: "OFFICER",
    email: "officer@test.com",
    phoneNumber: "+59171111111",
    ci: "7654321SC",
    birthDate: new Date("1995-01-10"),
    policeRank: "SARGENTO_PRIMERO",
    escalafon: "ABC1234"
  });
  await officer.setPassword("123456");
  await officer.save();

  // Ubicación inicial del oficial
  await Location.create({
    userId: officer._id,
    coords: { type: "Point", coordinates: [-68.1193, -16.4897] },
    accuracyM: 5
  });

  // ---------------------------------------------------------------------
  // 🖥️ 3. Crear usuario OPERATOR
  // ---------------------------------------------------------------------
  const operator = new User({
    firstName: "Operador",
    lastName: "Central",
    role: "OPERATOR",
    email: "operator@test.com",
    phoneNumber: "+59179990000",
    ci: "9988776LP",
    birthDate: new Date("1998-05-20")
  });
  await operator.setPassword("123456");
  await operator.save();

  // ---------------------------------------------------------------------
  // ⭐ 4. Crear usuario ADMIN
  // ---------------------------------------------------------------------
  const admin = new User({
    firstName: "Admin",
    lastName: "Master",
    role: "ADMIN",
    email: "admin@test.com",
    phoneNumber: "+59172223333",
    ci: "5554443CB",
    birthDate: new Date("1990-08-12")
  });
  await admin.setPassword("admin123");
  await admin.save();

  // ---------------------------------------------------------------------
  // ✔ Logs finales
  // ---------------------------------------------------------------------
  console.log("seed done");
  console.log("civil id:", civil._id.toString());
  console.log("officer id:", officer._id.toString());
  console.log("operator id:", operator._id.toString());
  console.log("admin id:", admin._id.toString());

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

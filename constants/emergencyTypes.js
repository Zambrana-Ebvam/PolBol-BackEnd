const EMERGENCY_TYPES = [
  { code: "ROBO", label: "Robo / Asalto" },
  { code: "VIOLENCIA", label: "Violencia / Agresión" },
  { code: "ACCIDENTE", label: "Accidente de tránsito" },
  { code: "INCENDIO", label: "Incendio" },
  { code: "SALUD", label: "Emergencia médica" },
  { code: "PERSONA_SOSPECHOSA", label: "Persona sospechosa" },
  { code: "OTRO", label: "Otro" },
];

const POLICE_RANKS = [
  "GACIP - Voluntario",
  "ALUMNO",
  "SARGENTO",
  "SARGENTO_SEGUNDO",
  "SARGENTO_PRIMERO",
  "SARGENTO_MAYOR",
  "SUBOFICIAL_SEGUNDO",
  "SUBOFICIAL_PRIMERO",
  "SUBOFICIAL_MAYOR",
  "SUBOFICIAL_SUPERIOR",
  "CADETE",
  "SUBTENIENTE",
  "TENIENTE",
  "CAPITAN",
  "MAYOR",
  "TENIENTE_CORONEL",
  "CORONEL",
  "GENERAL_PRIMERO",
  "GENERAL_MAYOR",
  "GENERAL_SUPERIOR",
];

const USER_ROLES = {
  CIVIL: "CIVIL",
  OFFICER: "OFFICER",
  OPERATOR: "OPERATOR",
  ADMIN: "ADMIN",
};

const INCIDENT_STATUS = {
  OPEN: "OPEN",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CANCELLED: "CANCELLED",
};

module.exports = {
  EMERGENCY_TYPES,
  POLICE_RANKS,
  USER_ROLES,
  INCIDENT_STATUS,
};

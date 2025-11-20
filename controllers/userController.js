const User = require('../models/User');
const Location = require('../models/Location');
const { success, error } = require('../utils/responseHelpers');
const { ROLE_PERMISSIONS } = require('../utils/constants');

// GET /api/users - Listar usuarios con filtros avanzados (SOLO ADMIN/OPERATOR)
exports.getUsers = async (req, res, next) => {
  try {
    const { 
      role, 
      isActive, 
      page = 1, 
      limit = 20, 
      search,
      rank,
      unit,
      specialization,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Construir query avanzado
    let query = { isActive: isActive !== 'false' };
    
    if (role) query.role = role;
    if (rank) query.rank = rank;
    if (unit) query.unit = { $regex: unit, $options: 'i' };
    if (specialization) query.specialization = specialization;
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { badgeNumber: { $regex: search, $options: 'i' } },
        { identityCard: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-__v -refreshToken')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sort);

    const total = await User.countDocuments(query);

    success(res, {
      users: users.map(user => user.getPublicProfile()),
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id - Obtener usuario por ID con ubicación
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-__v -refreshToken');
    
    if (!user) {
      return error(res, 'Usuario no encontrado', 404);
    }

    // Verificar permisos: usuarios solo pueden ver su propio perfil, ADMIN/OPERATOR pueden ver todos
    if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR' && req.user._id.toString() !== req.params.id) {
      return error(res, 'No autorizado para ver este usuario', 403);
    }

    // Obtener ubicación actual si existe
    let location = null;
    if (user.role === 'OFFICER' || user.role === 'CIVIL') {
      location = await Location.findOne({ userId: user._id });
    }

    const userData = user.getPublicProfile();
    
    success(res, {
      ...userData,
      currentLocation: location ? location.toMapFormat() : null
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/users - Crear nuevo usuario (SOLO ADMIN)
// POST /api/users - Crear nuevo usuario (SOLO ADMIN)
exports.createUser = async (req, res, next) => {
  try {
    const { 
      fullName, 
      role, 
      phoneNumber, 
      email, 
      identityCard, 
      badgeNumber, 
      rank, 
      unit,
      specialization,
      emergencyContact,
      avatarUrl,
      permissions,
      password
    } = req.body;

    // Validaciones básicas
    if (!fullName || !role) {
      return error(res, 'Nombre completo y rol son requeridos', 400);
    }

    // ✅ CORRECCIÓN: Sincronización automática de permisos
    let finalPermissions = permissions || ROLE_PERMISSIONS[role] || [];
    
    // Validar y filtrar permisos inválidos
    if (ROLE_PERMISSIONS[role]) {
      const invalidPermissions = finalPermissions.filter(perm => 
        !ROLE_PERMISSIONS[role].includes(perm)
      );
      
      if (invalidPermissions.length > 0) {
        console.warn(`Filtrando permisos inválidos para rol ${role}:`, invalidPermissions);
        finalPermissions = finalPermissions.filter(perm => 
          ROLE_PERMISSIONS[role].includes(perm)
        );
      }
    }

    // Resto del código permanece igual...
    const userData = {
      fullName: fullName.trim(),
      role,
      phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
      email: email ? email.toLowerCase().trim() : undefined,
      identityCard: identityCard ? identityCard.trim() : undefined,
      badgeNumber: badgeNumber ? badgeNumber.toUpperCase().trim() : undefined,
      rank,
      unit: unit ? unit.trim() : undefined,
      specialization: specialization || [],
      emergencyContact,
      avatarUrl: avatarUrl ? avatarUrl.trim() : undefined,
      permissions: finalPermissions // ✅ Usar permisos sincronizados
    };

    // Solo incluir password si se proporciona (para roles no CIVIL)
    if (password) {
      userData.password = password;
    }

    const user = await User.create(userData);
    
    success(res, user.getPublicProfile(), 'Usuario creado exitosamente', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id - Actualizar usuario completo
exports.updateUser = async (req, res, next) => {
  try {
    const { 
      fullName, 
      phoneNumber, 
      email, 
      rank, 
      unit, 
      specialization,
      isActive,
      emergencyContact,
      avatarUrl,
      permissions,
      role // ✅ NUEVO: Permitir cambio de rol solo para ADMIN
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return error(res, 'Usuario no encontrado', 404);
    }

    // Verificar permisos: solo ADMIN puede modificar otros usuarios
    if (req.user.role !== 'ADMIN' && req.user._id.toString() !== req.params.id) {
      return error(res, 'No autorizado para modificar este usuario', 403);
    }

    // OPERATOR no puede modificar roles o permisos de otros usuarios
    if (req.user.role === 'OPERATOR' && req.user._id.toString() !== req.params.id) {
      if (permissions || role) {
        return error(res, 'No autorizado para modificar permisos o roles de otros usuarios', 403);
      }
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (phoneNumber) updateData.phoneNumber = phoneNumber.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    
    // ✅ NUEVO: Sincronización automática de permisos
    let finalPermissions = permissions;
    const targetRole = role || user.role;
    
    // Si el rol cambia o no se envían permisos, sincronizar automáticamente
    if ((role && role !== user.role) || !permissions) {
      finalPermissions = ROLE_PERMISSIONS[targetRole] || [];
    }
    
    // Validar permisos contra el rol destino
    if (finalPermissions && ROLE_PERMISSIONS[targetRole]) {
      const invalidPermissions = finalPermissions.filter(perm => 
        !ROLE_PERMISSIONS[targetRole].includes(perm)
      );
      
      if (invalidPermissions.length > 0) {
        // ✅ CORRECCIÓN: En lugar de error, filtrar permisos inválidos automáticamente
        console.warn(`Filtrando permisos inválidos para rol ${targetRole}:`, invalidPermissions);
        finalPermissions = finalPermissions.filter(perm => 
          ROLE_PERMISSIONS[targetRole].includes(perm)
        );
      }
    }

    // Solo ADMIN puede modificar estos campos
    if (req.user.role === 'ADMIN') {
      if (role) updateData.role = role;
      if (rank) updateData.rank = rank;
      if (unit) updateData.unit = unit.trim();
      if (specialization !== undefined) updateData.specialization = specialization;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (finalPermissions) updateData.permissions = finalPermissions;
    }
    
    // Campos que pueden modificar todos los usuarios en su propio perfil
    if (emergencyContact) updateData.emergencyContact = emergencyContact;
    if (avatarUrl) updateData.avatarUrl = avatarUrl.trim();

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-__v -refreshToken');

    success(res, updatedUser.getPublicProfile(), 'Usuario actualizado exitosamente');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id/availability - Actualizar disponibilidad de oficial
exports.updateAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return error(res, 'Usuario no encontrado', 404);
    }

    if (user.role !== 'OFFICER') {
      return error(res, 'Solo los oficiales pueden actualizar su disponibilidad', 400);
    }

    // Verificar permisos: solo el propio oficial o ADMIN/OPERATOR pueden modificar disponibilidad
    if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR' && req.user._id.toString() !== req.params.id) {
      return error(res, 'No autorizado para modificar la disponibilidad de este oficial', 403);
    }

    if (isAvailable) {
      await user.markAsAvailable();
    } else {
      await user.markAsUnavailable();
    }

    const updatedUser = await User.findById(req.params.id).select('-__v -refreshToken');

    success(res, updatedUser.getPublicProfile(), `Oficial ${isAvailable ? 'disponible' : 'no disponible'}`);
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id/location - Obtener ubicación de usuario
exports.getUserLocation = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return error(res, 'Usuario no encontrado', 404);
    }

    // Verificar permisos: usuarios solo pueden ver su propia ubicación, ADMIN/OPERATOR pueden ver todas
    if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR' && req.user._id.toString() !== req.params.id) {
      return error(res, 'No autorizado para ver la ubicación de este usuario', 403);
    }

    const location = await Location.findOne({ userId: user._id })
      .populate('userId', 'fullName role badgeNumber rank');

    if (!location) {
      return error(res, 'Ubicación no encontrada para este usuario', 404);
    }

    success(res, location.toMapFormat());
  } catch (err) {
    next(err);
  }
};

// GET /api/users/stats/summary - Estadísticas avanzadas de usuarios (SOLO ADMIN/OPERATOR)
exports.getUserStats = async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      {
        $facet: {
          totalUsers: [{ $count: 'count' }],
          usersByRole: [
            { $group: { _id: '$role', count: { $sum: 1 } } }
          ],
          activeUsers: [
            { $match: { isActive: true } },
            { $count: 'count' }
          ],
          officersByRank: [
            { $match: { role: 'OFFICER', isActive: true } },
            { $group: { _id: '$rank', count: { $sum: 1 } } }
          ],
          availableOfficers: [
            { 
              $match: { 
                role: 'OFFICER', 
                isActive: true, 
                isAvailable: true 
              } 
            },
            { $count: 'count' }
          ],
          specializationStats: [
            { $match: { role: 'OFFICER', isActive: true } },
            { $unwind: '$specialization' },
            { $group: { _id: '$specialization', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          recentRegistrations: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 6 }
          ]
        }
      }
    ]);

    const result = stats[0];
    
    success(res, {
      total: result.totalUsers[0]?.count || 0,
      active: result.activeUsers[0]?.count || 0,
      byRole: result.usersByRole,
      officersByRank: result.officersByRank,
      availableOfficers: result.availableOfficers[0]?.count || 0,
      specializations: result.specializationStats,
      recentRegistrations: result.recentRegistrations
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/search/officers - Búsqueda avanzada de oficiales
exports.searchOfficers = async (req, res, next) => {
  try {
    const { 
      specialization, 
      rank, 
      unit, 
      isAvailable,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = { 
      role: 'OFFICER', 
      isActive: true 
    };

    if (specialization) query.specialization = specialization;
    if (rank) query.rank = rank;
    if (unit) query.unit = { $regex: unit, $options: 'i' };
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';

    const officers = await User.find(query)
      .select('badgeNumber rank fullName unit specialization phoneNumber isAvailable')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ rank: 1, fullName: 1 });

    const total = await User.countDocuments(query);

    // Obtener ubicaciones de los oficiales
    const officerIds = officers.map(officer => officer._id);
    const locations = await Location.find({ 
      userId: { $in: officerIds },
      updatedAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
    });

    const officersWithLocation = officers.map(officer => {
      const location = locations.find(loc => 
        loc.userId.toString() === officer._id.toString()
      );
      
      return {
        ...officer.toObject(),
        currentLocation: location ? location.toMapFormat() : null,
        isRecent: location ? location.isRecent : false
      };
    });

    success(res, {
      officers: officersWithLocation,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id - Desactivar usuario (SOLO ADMIN)
exports.deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false, isAvailable: false } },
      { new: true }
    ).select('-__v -refreshToken');

    if (!user) {
      return error(res, 'Usuario no encontrado', 404);
    }

    // No permitir desactivarse a sí mismo
    if (req.user._id.toString() === req.params.id) {
      return error(res, 'No puede desactivar su propio usuario', 400);
    }

    success(res, user.getPublicProfile(), 'Usuario desactivado exitosamente');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id/activate - Reactivar usuario (SOLO ADMIN)
exports.activateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: true } },
      { new: true }
    ).select('-__v -refreshToken');

    if (!user) {
      return error(res, 'Usuario no encontrado', 404);
    }

    success(res, user.getPublicProfile(), 'Usuario reactivado exitosamente');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id/password - Cambiar contraseña (usuario propio o ADMIN)
exports.changeUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return error(res, 'Nueva contraseña es requerida', 400);
    }

    if (newPassword.length < 6) {
      return error(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return error(res, 'Usuario no encontrado', 404);
    }

    // Verificar permisos: solo el propio usuario o ADMIN pueden cambiar la contraseña
    if (req.user.role !== 'ADMIN' && req.user._id.toString() !== req.params.id) {
      return error(res, 'No autorizado para cambiar la contraseña de este usuario', 403);
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    success(res, null, 'Contraseña actualizada exitosamente');
  } catch (err) {
    next(err);
  }
};

// GET /api/users/profile/me - Obtener perfil del usuario autenticado
exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-__v -refreshToken');
    
    if (!user) {
      return error(res, 'Usuario no encontrado', 404);
    }

    // Obtener ubicación actual si existe
    let location = null;
    if (user.role === 'OFFICER' || user.role === 'CIVIL') {
      location = await Location.findOne({ userId: user._id });
    }

    const userData = user.getPublicProfile();
    
    success(res, {
      ...userData,
      currentLocation: location ? location.toMapFormat() : null
    });
  } catch (err) {
    next(err);
  }
};
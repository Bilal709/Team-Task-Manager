const Joi = require('joi');

// Validation schemas for all routes
const schemas = {
  // Auth routes
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    })
  }),
  
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),
  
  // Team routes
  createTeam: Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      'string.empty': 'Team name cannot be empty',
      'string.max': 'Team name cannot exceed 100 characters',
      'any.required': 'Team name is required'
    })
  }),
  
  addMember: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
  }),
  
  inviteMember: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
  }),
  
  // Task routes
  createTask: Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
      'string.empty': 'Task title cannot be empty',
      'string.max': 'Task title cannot exceed 255 characters',
      'any.required': 'Task title is required'
    }),
    description: Joi.string().allow('', null).max(2000).messages({
      'string.max': 'Description cannot exceed 2000 characters'
    }),
    status: Joi.string().valid('pending', 'in_progress', 'completed').default('pending'),
    due_date: Joi.date().allow(null).messages({
      'date.base': 'Please provide a valid date'
    }),
    team_id: Joi.number().integer().positive().required().messages({
      'number.base': 'Team ID must be a number',
      'any.required': 'Team ID is required'
    }),
    assignee_ids: Joi.array().items(Joi.number().integer().positive()).default([])
  }),
  
  updateTask: Joi.object({
    title: Joi.string().min(1).max(255).messages({
      'string.empty': 'Task title cannot be empty',
      'string.max': 'Task title cannot exceed 255 characters'
    }),
    description: Joi.string().allow('', null).max(2000),
    status: Joi.string().valid('pending', 'in_progress', 'completed'),
    due_date: Joi.date().allow(null),
    assignee_ids: Joi.array().items(Joi.number().integer().positive())
  })
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      // If schema doesn't exist, skip validation (should not happen)
      return next();
    }
    
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,  // Return all errors, not just the first one
      stripUnknown: true   // Remove unknown fields
    });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors 
      });
    }
    
    // Replace req.body with validated value (stripped of unknown fields)
    req.body = value;
    next();
  };
};

module.exports = { validate };
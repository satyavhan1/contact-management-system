const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// In-memory database reference (will be set by server.js)
let db;

// ========================
// APPLY AUTHENTICATION TO ALL CONTACT ROUTES
// ========================
router.use(isAuthenticated);

// ========================
// VALIDATION FUNCTIONS
// ========================

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone format (accepts various formats)
const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s\-+()]{7,20}$/;
  return phoneRegex.test(phone);
};

// Validate category
const validateCategory = (category) => {
  const allowedCategories = ['Family', 'Friends', 'Work', 'Clients', ''];
  return allowedCategories.includes(category);
};

// Validate contact input
const validateContactInput = (name, email, phone, category) => {
  const errors = [];
  
  if (!name || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
  }
  if (!email || !validateEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }
  if (!phone || !validatePhone(phone)) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number (7-20 characters)' });
  }
  if (category && !validateCategory(category)) {
    errors.push({ field: 'category', message: 'Invalid category selected' });
  }
  
  return errors;
};

// Validate sort column to prevent SQL injection
const validateSortColumn = (column) => {
  const allowedColumns = ['name', 'email', 'phone', 'id', 'created_at', 'is_favorite', 'category'];
  return allowedColumns.includes(column) ? column : 'name';
};

// ========================
// ROUTES
// ========================

/* GET CONTACTS with Pagination, Search, and Sorting */
router.get("/", (req, res) => {
  try {
    // Get the logged-in user's ID
    const userId = req.user.id;
    
    // Parse query parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const sortBy = validateSortColumn(req.query.sortBy || 'name');
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const isExport = req.query.export === 'csv';
    const showFavorites = req.query.favorites === 'true';
    const filterCategory = req.query.category || '';
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Base queries with user_id filter
    let countQuery = "SELECT COUNT(*) as total FROM contacts WHERE user_id = ?";
    let dataQuery = "SELECT * FROM contacts WHERE user_id = ?";
    let params = [userId];
    
    // Add favorites filter if enabled
    if (showFavorites) {
      const favCondition = " AND is_favorite = TRUE";
      countQuery += favCondition;
      dataQuery += favCondition;
    }
    
    // Add category filter if selected
    if (filterCategory) {
      const catCondition = " AND category = ?";
      countQuery += catCondition;
      dataQuery += catCondition;
      params.push(filterCategory);
    }
    
    // Add search condition if search query exists
    if (search) {
      const searchCondition = " AND name LIKE ?";
      countQuery += searchCondition;
      dataQuery += searchCondition;
      params.push(`%${search}%`);
    }
    
    // Build count query params - must match data query params order
    let countQueryParams = [userId];
    
    if (showFavorites) {
      countQueryParams.push(1);
    }
    
    if (filterCategory) {
      countQueryParams.push(filterCategory);
    }
    
    if (search) {
      countQueryParams.push(`%${search}%`);
    }
    
    // Get total count with all filters
    db.query(countQuery, countQueryParams, (err, countResult) => {
      if (err) {
        console.error('Count query error:', err);
        return res.status(500).json({ error: "Failed to get contacts count" });
      }
      
      const total = countResult[0].total;
      
      // Handle CSV export request
      if (isExport) {
        dataQuery += ` ORDER BY ${sortBy} ${sortOrder}`;
        
        db.query(dataQuery, params, (err, result) => {
          if (err) {
            console.error('Export query error:', err);
            return res.status(500).json({ error: "Failed to export contacts" });
          }
          
          // Convert to CSV format with all fields
          const csvHeader = 'ID,Name,Email,Phone,Category,Favorite\n';
          const csvRows = result.map(contact => 
            `${contact.id},"${contact.name}","${contact.email}","${contact.phone}","${contact.category || ''}","${contact.is_favorite ? 'Yes' : 'No'}"`
          ).join('\n');
          
          const csv = csvHeader + csvRows;
          
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=contacts_export.csv');
          res.send(csv);
        });
        return;
      }
      
      // Regular paginated request
      const totalPages = Math.ceil(total / limit);
      
      dataQuery += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      db.query(dataQuery, params, (err, result) => {
        if (err) {
          console.error('Data query error:', err);
          return res.status(500).json({ error: "Failed to fetch contacts" });
        }
        
        res.json({
          contacts: result,
          pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalContacts: total,
            contactsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        });
      });
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

/* GET TOTAL CONTACTS COUNT */
router.get("/count", (req, res) => {
  try {
    const userId = req.user.id;
    db.query("SELECT COUNT(*) as total FROM contacts WHERE user_id = ?", [userId], (err, result) => {
      if (err) {
        console.error('Count query error:', err);
        return res.status(500).json({ error: "Failed to get contacts count" });
      }
      res.json({ total: result[0].total });
    });
  } catch (error) {
    console.error('Get count error:', error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

/* ADD CONTACT with validation and duplicate email check */
router.post("/", (req, res) => {
  try {
    const { name, email, phone, category } = req.body;
    const userId = req.user.id;
    
    // Validate input
    const validationErrors = validateContactInput(name, email, phone, category);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        validationErrors 
      });
    }
    
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedCategory = category ? category.trim() : '';
    
    // Check for duplicate email using prepared statement (only for this user)
    db.query("SELECT id FROM contacts WHERE LOWER(email) = ? AND user_id = ?", [trimmedEmail, userId], (err, result) => {
      if (err) {
        console.error('Duplicate check error:', err);
        return res.status(500).json({ error: "Database error during validation" });
      }
      
      if (result.length > 0) {
        return res.status(400).json({ 
          error: "Duplicate email", 
          message: "This email already exists!",
          field: 'email'
        });
      }
      
      // Insert new contact using prepared statement (include user_id and category)
      const sql = "INSERT INTO contacts (name, email, phone, category, user_id) VALUES (?, ?, ?, ?, ?)";
      db.query(sql, [trimmedName, trimmedEmail, trimmedPhone, trimmedCategory, userId], (err, result) => {
        if (err) {
          console.error('Insert error:', err);
          return res.status(500).json({ error: "Failed to add contact" });
        }
        
        res.status(201).json({ 
          message: "Contact added successfully", 
          id: result.insertId,
          contact: { id: result.insertId, name: trimmedName, email: trimmedEmail, phone: trimmedPhone, category: trimmedCategory }
        });
      });
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

/* UPDATE CONTACT with validation and duplicate email check */
router.put("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid contact ID" });
    }
    
    const { name, email, phone, category } = req.body;
    
    // Validate input
    const validationErrors = validateContactInput(name, email, phone, category);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        validationErrors 
      });
    }
    
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedCategory = category ? category.trim() : '';
    
    // Check if contact exists AND belongs to the user
    db.query("SELECT id FROM contacts WHERE id = ? AND user_id = ?", [id, userId], (err, result) => {
      if (err) {
        console.error('Existence check error:', err);
        return res.status(500).json({ error: "Database error" });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      // Check for duplicate email (excluding current contact, only for this user)
      db.query("SELECT id FROM contacts WHERE LOWER(email) = ? AND id != ? AND user_id = ?", [trimmedEmail, id, userId], (err, result) => {
        if (err) {
          console.error('Duplicate check error:', err);
          return res.status(500).json({ error: "Database error during validation" });
        }
        
        if (result.length > 0) {
          return res.status(400).json({ 
            error: "Duplicate email", 
            message: "This email already exists!",
            field: 'email'
          });
        }
        
        // Update contact using prepared statement (ensure user owns the contact)
        const sql = "UPDATE contacts SET name = ?, email = ?, phone = ?, category = ? WHERE id = ? AND user_id = ?";
        db.query(sql, [trimmedName, trimmedEmail, trimmedPhone, trimmedCategory, id, userId], (err, result) => {
          if (err) {
            console.error('Update error:', err);
            return res.status(500).json({ error: "Failed to update contact" });
          }
          
          res.json({ 
            message: "Contact updated successfully",
            contact: { id, name: trimmedName, email: trimmedEmail, phone: trimmedPhone, category: trimmedCategory }
          });
        });
      });
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

/* DELETE CONTACT */
router.delete("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid contact ID" });
    }
    
    // First get the contact to check for existing photo
    db.query("SELECT photo FROM contacts WHERE id = ? AND user_id = ?", [id, userId], (err, result) => {
      if (err) {
        console.error('Select error:', err);
        return res.status(500).json({ error: "Database error" });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      // Delete old photo file if exists
      const oldPhoto = result[0].photo;
      if (oldPhoto) {
        const photoPath = path.join(__dirname, '../public', oldPhoto);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }
      
      // Delete the contact
      db.query("DELETE FROM contacts WHERE id = ? AND user_id = ?", [id, userId], (err, result) => {
        if (err) {
          console.error('Delete error:', err);
          return res.status(500).json({ error: "Failed to delete contact" });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Contact not found" });
        }
        
        res.json({ message: "Contact deleted successfully" });
      });
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

/* TOGGLE FAVORITE STATUS */
router.put("/:id/favorite", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid contact ID" });
    }
    
    // Check if contact exists AND belongs to the user
    db.query("SELECT is_favorite FROM contacts WHERE id = ? AND user_id = ?", [id, userId], (err, result) => {
      if (err) {
        console.error('Existence check error:', err);
        return res.status(500).json({ error: "Database error" });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      // Toggle favorite status
      const currentStatus = result[0].is_favorite || false;
      const newStatus = !currentStatus;
      
      db.query("UPDATE contacts SET is_favorite = ? WHERE id = ? AND user_id = ?", [newStatus, id, userId], (err, result) => {
        if (err) {
          console.error('Favorite toggle error:', err);
          return res.status(500).json({ error: "Failed to update favorite status" });
        }
        
        res.json({ 
          message: newStatus ? "Contact marked as favorite" : "Contact removed from favorites",
          is_favorite: newStatus
        });
      });
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

/* UPLOAD CONTACT PHOTO */
router.post("/:id/photo", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid contact ID" });
    }
    
    // Check if contact exists AND belongs to the user
    db.query("SELECT photo FROM contacts WHERE id = ? AND user_id = ?", [id, userId], (err, result) => {
      if (err) {
        console.error('Existence check error:', err);
        return res.status(500).json({ error: "Database error" });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      // Get upload middleware from app
      const upload = req.app.get('upload');
      
      // Use multer to handle the file upload
      upload.single('photo')(req, res, (err) => {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({ error: err.message || "Failed to upload photo" });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        
        // Delete old photo if exists
        const oldPhoto = result[0].photo;
        if (oldPhoto) {
          const photoPath = path.join(__dirname, '../public', oldPhoto);
          if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
          }
        }
        
        // Store the file path (relative to public folder)
        const photoPath = `/uploads/${req.file.filename}`;
        
        // Update database with new photo path
        db.query("UPDATE contacts SET photo = ? WHERE id = ? AND user_id = ?", [photoPath, id, userId], (err, result) => {
          if (err) {
            console.error('Photo update error:', err);
            // Delete uploaded file if database update fails
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ error: "Failed to save photo" });
          }
          
          res.json({ 
            message: "Photo uploaded successfully",
            photo: photoPath
          });
        });
      });
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

// Set database connection
router.setDb = (database) => {
  db = database;
};

module.exports = router;


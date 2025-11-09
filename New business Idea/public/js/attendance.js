// Enhanced Attendance Management with Add Student Functionality

let currentClass = 'form1a';
let students = [];

// Initialize attendance module
async function initializeAttendance() {
    if (!checkAuth()) return;
    
    const user = getCurrentUser();
    if (user.role !== 'admin' && user.role !== 'staff') {
        document.getElementById('attendanceContent').innerHTML = 
            '<div class="error-message">Access denied. Only staff and administrators can manage attendance.</div>';
        return;
    }

    await loadAttendanceInterface();
    await loadStudents();
}

// Load attendance interface
async function loadAttendanceInterface() {
    const container = document.getElementById('attendanceContent');
    
    container.innerHTML = `
        <div class="add-student-form">
            <h3>Add New Student</h3>
            <div class="form-row">
                <div class="form-group">
                    <label for="newStudentName">Student Name</label>
                    <input type="text" id="newStudentName" placeholder="Enter full name" required>
                </div>
                <div class="form-group">
                    <label for="newStudentId">Student ID</label>
                    <input type="text" id="newStudentId" placeholder="e.g., STU001" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="newStudentClass">Class</label>
                    <select id="newStudentClass" required>
                        <option value="">Select Class</option>
                        <option value="form1a">Form 1A</option>
                        <option value="form1b">Form 1B</option>
                        <option value="form2a">Form 2A</option>
                        <option value="form3a">Form 3A</option>
                        <option value="form4a">Form 4A</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="newStudentEmail">Email (Optional)</label>
                    <input type="email" id="newStudentEmail" placeholder="student@email.com">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="newStudentPhone">Phone (Optional)</label>
                    <input type="tel" id="newStudentPhone" placeholder="+263 77 123 4567">
                </div>
                <div class="form-group" style="display: flex; align-items: end;">
                    <button type="button" class="btn" onclick="addNewStudent()" style="width: 100%;">Add Student</button>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 2rem;">
            <div class="form-group">
                <label for="classSelect">Select Class to View</label>
                <select id="classSelect" onchange="loadStudents()">
                    <option value="form1a">Form 1A</option>
                    <option value="form1b">Form 1B</option>
                    <option value="form2a">Form 2A</option>
                    <option value="form3a">Form 3A</option>
                    <option value="form4a">Form 4A</option>
                </select>
            </div>
        </div>

        <div class="attendance-grid" id="studentsContainer">
            <div class="loading">Loading students...</div>
        </div>
    `;
}

// Load students for selected class
async function loadStudents() {
    const classSelect = document.getElementById('classSelect');
    const container = document.getElementById('studentsContainer');
    
    if (!classSelect) return;
    
    currentClass = classSelect.value;
    container.innerHTML = '<div class="loading">Loading students...</div>';

    try {
        students = await StudentsAPI.getByClass(currentClass);
        renderStudents();
    } catch (error) {
        container.innerHTML = '<div class="error-message">Error loading students: ' + error.message + '</div>';
    }
}

// Render students in the grid
function renderStudents() {
    const container = document.getElementById('studentsContainer');
    
    if (students.length === 0) {
        container.innerHTML = `
            <div class="dashboard-card" style="grid-column: 1 / -1; text-align: center;">
                <h3>No students found in ${currentClass.toUpperCase()}</h3>
                <p>Add students using the form above.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = students.map(student => `
        <div class="student-card" data-student-id="${student._id}">
            <div class="student-header">
                <div class="student-name">${student.name}</div>
                <div class="attendance-status status-${student.status}">
                    ${student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                </div>
            </div>
            <div class="performance-chart">
                <div class="performance-item">
                    <span>Attendance</span>
                    <strong>${student.attendance}%</strong>
                </div>
                <div class="performance-bar" style="width: ${student.attendance}%"></div>
                <div class="performance-item" style="margin-top: 0.5rem;">
                    <span>Performance</span>
                    <strong>${student.performance}%</strong>
                </div>
                <div class="performance-bar" style="width: ${student.performance}%"></div>
            </div>
            <div class="attendance-actions">
                <button class="btn-small btn-success" onclick="markAttendance('${student._id}', 'present')">Present</button>
                <button class="btn-small btn-danger" onclick="markAttendance('${student._id}', 'absent')">Absent</button>
                <button class="btn-small btn-warning" onclick="markAttendance('${student._id}', 'late')">Late</button>
            </div>
            <div class="student-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                <button class="btn-small" style="background: var(--navy); color: white;" onclick="editStudent('${student._id}')">Edit</button>
                <button class="btn-small btn-danger" onclick="deleteStudent('${student._id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Add new student
async function addNewStudent() {
    const name = document.getElementById('newStudentName').value.trim();
    const studentId = document.getElementById('newStudentId').value.trim();
    const studentClass = document.getElementById('newStudentClass').value;
    const email = document.getElementById('newStudentEmail').value.trim();
    const phone = document.getElementById('newStudentPhone').value.trim();

    if (!name || !studentId || !studentClass) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const studentData = {
            name,
            studentId,
            class: studentClass,
            email: email || undefined,
            phone: phone || undefined
        };

        await StudentsAPI.create(studentData);
        
        showNotification('Student added successfully!');
        
        // Clear form
        document.getElementById('newStudentName').value = '';
        document.getElementById('newStudentId').value = '';
        document.getElementById('newStudentClass').value = '';
        document.getElementById('newStudentEmail').value = '';
        document.getElementById('newStudentPhone').value = '';

        // Reload students if viewing the same class
        if (currentClass === studentClass) {
            await loadStudents();
        }
    } catch (error) {
        showNotification('Error adding student: ' + error.message, 'error');
    }
}

// Mark attendance
async function markAttendance(studentId, status) {
    try {
        await StudentsAPI.updateAttendance(studentId, status);
        
        // Update local data
        const student = students.find(s => s._id === studentId);
        if (student) {
            student.status = status;
            renderStudents();
        }
        
        showNotification(`Attendance marked: ${status}`);
    } catch (error) {
        showNotification('Error updating attendance: ' + error.message, 'error');
    }
}

// Edit student (placeholder for future enhancement)
function editStudent(studentId) {
    const student = students.find(s => s._id === studentId);
    if (!student) return;

    // For now, just show an alert with student info
    // This can be enhanced with a modal form later
    const newName = prompt('Edit student name:', student.name);
    if (newName && newName !== student.name) {
        updateStudentInfo(studentId, { name: newName });
    }
}

// Update student information
async function updateStudentInfo(studentId, updates) {
    try {
        await StudentsAPI.update(studentId, updates);
        showNotification('Student updated successfully!');
        await loadStudents();
    } catch (error) {
        showNotification('Error updating student: ' + error.message, 'error');
    }
}

// Delete student
async function deleteStudent(studentId) {
    const student = students.find(s => s._id === studentId);
    if (!student) return;

    if (!confirm(`Are you sure you want to delete ${student.name}? This will also delete their user account.`)) {
        return;
    }

    try {
        await StudentsAPI.delete(studentId);
        showNotification('Student deleted successfully!');
        await loadStudents();
    } catch (error) {
        showNotification('Error deleting student: ' + error.message, 'error');
    }
}

// Export functions for global access
window.initializeAttendance = initializeAttendance;
window.loadStudents = loadStudents;
window.addNewStudent = addNewStudent;
window.markAttendance = markAttendance;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
# Team Task Manager 
"# Team-Task-Manager" 

## 🚀 Setup Instructions

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Bilal709/Team-Task-Manager.git
cd Team-Task-Manager

#database setup
# Connect to PostgreSQL
psql -U postgres

# Create the database (run this inside psql)
CREATE DATABASE task_manager;

# Exit psql
\q

# Run the schema to create tables
psql -U postgres -d task_manager -f backend/db/schema.sql


#backend setup

# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create environment file from example
cp .env.example .env

# Edit the .env file with your database credentials
# (See Environment Variables section below)

# Start the backend server
npm run dev

The backend will run at http://localhost:5000


#Frontend Setup


# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start the frontend development server
npm run dev

The frontend will run at http://localhost:5173

#Access the Application
Open your browser and go to http://localhost:5173

Click Register to create a new account

Login with your credentials

Start creating teams and tasks!


#environmental variables
Create a .env file in the backend folder with the following variables:

PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=task_manager
DB_USER=postgres
DB_PASSWORD=your_postgres_password
SESSION_SECRET=your_secret_key_here
NODE_ENV=development

Important: Replace your_postgres_password with the password you set during PostgreSQL installation.



##########################################🎮 How to Use the App
Create a Team
Click "+ New Team" button on the dashboard

Enter a team name

Click Create

Add Members to Team
Click "Members" on your team card

Enter a registered user's email address

Click "Add" (or "Invite" for stubbed email)

Create a Task
Select a team from the left panel

Click "+ New Task" button

Enter task title, description, and due date

Select multiple assignees using checkboxes

Click Create Task

Manage Tasks
Change task status via dropdown (Pending/In Progress/Completed)

Click Edit to modify task details

Click Delete to remove a task

Filter Tasks
Click on different teams to filter by team

Use the Assignee Filter dropdown to filter by assigned member

Toggle Dark Mode
Click the 🌙/☀️ button in the header to switch between light and dark themes
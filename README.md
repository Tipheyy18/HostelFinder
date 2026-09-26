# Contributing Guide

---

## 🚀 Git Workflow Steps

### 1. Clone the Repository
Clone the repository to your local machine and navigate into the project directory:

```bash
git clone https://github.com/Tipheyy18/HostelFinder.git

cd HostelFinder
```

---

### 2. Pull the Latest `dev` Branch
Ensure your local `dev` branch is completely up to date with the remote server before creating a new branch:

```bash
git pull origin dev
```

---

### 3. Create a New Branch
Create and switch to a dedicated working branch branching off `dev`. Use a descriptive name based on the task (e.g., `feature/user-login`, `fix/navbar-bug`):

```bash
git checkout -b <your-branch-name>
```

---

### 4. Make Your Changes
Open the project in your code editor, make the necessary code modifications, and test them locally.

---

### 5. Pull `dev` Branch Again
Before committing or pushing, pull the latest changes from the `dev` branch into your feature branch to ensure you have the latest code and resolve any potential conflicts early:

```bash
git pull origin dev
```

---

### 6. Stage, Commit, and Push Your Changes
Stage all your modified files, commit them with a descriptive commit message, and push your new branch to the remote repository:

```bash
# Stage all modified files
git add .

# Commit with a clear message
git commit -m "feat: implement user login component"

# Push your feature branch to the remote repository
git push origin <your-branch-name>
```

---

### 7. Create a Pull Request to `dev`
1. Navigate to the repository on GitHub.
2. Click on **Compare & pull request** next to your recently pushed branch.
3. Set the **base branch** (destination) to **`dev`**.
4. Set the **head branch** (source) to **`<your-branch-name>`**.
5. Provide a detailed title and description explaining the changes made.
6. Submit the Pull Request for review.

---

## 📋 Quick Command Reference

| Step | Action | Command |
| :--- | :--- | :--- |
| **1** | Clone repo | `git clone https://github.com/Tipheyy18/HostelFinder.git` |
| **2** | Pull latest `dev` | `git pull origin dev` |
| **3** | Create new branch | `git checkout -b <your-branch-name>` |
| **4** | Pull `dev` into branch | `git pull origin dev` |
| **5** | Stage changes | `git add .` |
| **6** | Commit changes | `git commit -m "description of changes"` |
| **7** | Push branch | `git push -u origin <your-branch-name>` |
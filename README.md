# Naruto Arena Remake

A web-based remake of the classic Naruto Arena strategy game, built with Node.js and Express.

## NOTE

* This project was made for educational purposes and is not intended for commercial use.

* It is not a direct remake of the original game, but rather a recreation of the game's features and mechanics.

* This project is not affiliated with the original game or its developers.

* This project is not production-ready and is not intended for use in a production environment, because again, it was made for educational purposes. If you want to host and run this project, you will need to make it production-ready on your own, which involves adjusting the code from file storage to a database, adding security features, and so on.

## 🚀 Features

Current implementation includes Beta 1.0 features of the original website and the game. However, other stages and versions of the game are planned.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS (Embedded JavaScript templates), CSS3, Vanilla JavaScript
- **Data Storage**: JSON-based file storage (Custom implementation)
- **Key Libraries**:
    - `activeUser`: Activity tracking middleware
    - `matchmaking`: Custom matchmaking service
    - `sharp`: Image processing

## 📂 Project Structure

The project code is located in the `beta-start/` directory.

- `src/controllers`: Handles request logic (Game, User, Polls, etc.)
- `src/models`: Data access layer dealing with JSON files.
- `src/services`: Core business logic (AI, Ladder, Matchmaking).
- `src/routes`: Express route definitions.
- `views`: EJS templates for the UI.
- `public`: Static assets (images, CSS, client-side JS).
- `data`: JSON data files storage.

## 📦 Installation

1.  **Prerequisites**: Ensure you have Node.js installed.
2.  **Clone/Download** the repository.
3.  **Navigate** to the project directory:
    ```bash
    cd beta-start
    ```
4.  **Install Dependencies**:
    ```bash
    npm install
    ```

## 🏁 Usage

1.  **Start the Server**:
    ```bash
    npm start
    ```
2.  **Access the Game**:
    Open your browser and navigate to `http://localhost:3000` (or the port defined in your config).
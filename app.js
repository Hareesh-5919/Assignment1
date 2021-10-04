const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");


const databasePath = path.join(__dirname, "usersdata.sqlite3");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3007, () => {
      console.log("Server Running at http://localhost:3007/");
    });
  } catch (error) {
    Response.send(`DB Error: ${error.message}`);
  }
};

initializeDbAndServer();




function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

app.post("/login/", async (req, res) => {
  const {username, password} = req.body;
  const dbUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
  const dbUser = await database.get(dbUserQuery);
  if (dbUser === undefined) {
    res.send("Invalid User");
  } else {
    const verifyPassword = await bcrypt.compare(password, dbUser.password);
    if(verifyPassword === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      res.send(`Login Success!!   authentication token: ${jwtToken}`);
    } else {
      res.send("Invalid Password");
    }
  }
})

app.post("/register/", async (request, response) => {
  const { id, username, name, password, contact } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      users (id, username, name, contact, password)
     VALUES
      (
        '${id}',
       '${username}',
       '${name}',
       ${contact},
       '${hashedPassword}' 
      );`;
    await database.run(createUserQuery);
    response.send("User created successfully");
    
  } else {
    response.status(400);
    response.send("User already exists");
  }
});


app.get("/users/",authenticateToken, async (request, response) => {
  const {id} = request.params;
  const getUserQuery = `
    SELECT id,name,username FROM users;
  `;
  const users = await database.all(getUserQuery);
  response.send(users);
})


app.put("/updateuserinfo/",authenticateToken, async (request, response) => {
  const {username,contact} = request.body;
  const getUserQuery = `
    UPDATE users SET contact= ${contact} WHERE username = '${username}';
  `;
  await database.run(getUserQuery);
  response.send("contact updated");
})

app.delete("/deleteuser/:userName/",authenticateToken, async (request, response) => {
  const {userName} = request.params
  const deleteUserQuery = `
    DELETE FROM users WHERE username = '${userName}';
  `;
  await database.run(deleteUserQuery);
  response.send("user deleted successfully");
})

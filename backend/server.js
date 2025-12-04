// Initialize Server
const express = require("express");
const server = express();
const port = 3000;
const mongoose = require("mongoose");
require("dotenv").config();
const { DB_URI, SECRET_KEY } = process.env;
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Models
const User = require("./models/user");
const Contact = require("./models/contact");

// Middleware
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// JWT Authentication Middleware
function authenticateUser(request, response, next) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return response.status(401).send({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    request.user = decoded; // store user id + username
    next();
  } catch (error) {
    response.status(403).send({ message: "Invalid token" });
  }
}

// Connections
mongoose
  .connect(DB_URI)
  .then(() => {
    server.listen(port, () => {
      console.log(`Connected to DB\nServer is listening on port ${port}`);
    });
  })
  .catch((error) => console.log(error));

// Routes
server.get("/", (request, response) => {
  response.send("Server is live!");
});

// Register new user
server.post("/register", async (request, response) => {
  const { username, password } = request.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
    });

    await newUser.save();
    response.send({ message: "User Created!" });
  } catch (error) {
    response
      .status(500)
      .send({ message: "User Already Exists, please find another username" });
  }
});

// Login existing user
server.post("/login", async (request, response) => {
  const { username, password } = request.body;
  try {
    const user = await User.findOne({ username });

    if (!user) {
      return response.status(404).send({ message: "User does not exist" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return response
        .status(403)
        .send({ message: "Incorrect username or password" });
    }

    const jwtToken = jwt.sign({ id: user._id, username }, SECRET_KEY);

    return response
      .status(201)
      .send({ message: "User Authenticated", token: jwtToken });
  } catch (error) {
    response.status(500).send({ message: error.message });
  }
});

//* CONTACTS (Protected Routes)

// GET all contacts for logged-in user
server.get("/contacts", authenticateUser, async (request, response) => {
  try {
    const contacts = await Contact.find({ userId: request.user.id });
    response.send(contacts);
  } catch (error) {
    response.status(500).send({ message: error.message });
  }
});

// POST a new contact
server.post("/contacts", authenticateUser, async (request, response) => {
  const { name, email, phone, address } = request.body;

  const newContact = new Contact({
    name,
    email,
    phone,
    address,
    userId: request.user.id,
  });

  try {
    await newContact.save();
    response.send({ message: "Contact Created!" });
  } catch (error) {
    response.status(400).send({ message: error.message });
  }
});

// GET one contact by id
server.get("/contacts/:id", authenticateUser, async (request, response) => {
  const { id } = request.params;

  try {
    const contact = await Contact.findOne({ _id: id, userId: request.user.id });
    response.send(contact);
  } catch (error) {
    response.status(500).send({ message: error.message });
  }
});

// UPDATE (PATCH) a contact
server.patch("/contacts/:id", authenticateUser, async (request, response) => {
  const { id } = request.params;
  const { name, email, phone, address } = request.body;

  try {
    await Contact.findOneAndUpdate(
      { _id: id, userId: request.user.id },
      { name, email, phone, address }
    );

    response.send({ message: "Contact Updated!" });
  } catch (error) {
    response.status(500).send({ message: error.message });
  }
});

// DELETE a contact
server.delete("/contacts/:id", authenticateUser, async (request, response) => {
  const { id } = request.params;

  try {
    await Contact.findOneAndDelete({ _id: id, userId: request.user.id });
    response.send({ message: "Contact Deleted!" });
  } catch (error) {
    response.status(500).send({ message: error.message });
  }
});

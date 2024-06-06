const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000; // Use the port from environment variables or default to 5000

const uri =
  "mongodb+srv://faveejiofor2009:ybffqUz8267uEFY6@portfolio.0ixnpy5.mongodb.net/?retryWrites=true&w=majority&appName=Portfolio";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'build')));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: fileFilter,
});

let database, collection;

async function initializeDatabase() {
  try {
    await client.connect();
    database = client.db("portfolio");
    collection = database.collection("user");
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
    process.exit(1); // Exit the process with an error code
  }
}

async function getCollectionData() {
  try {
    const data = await collection.find({}).toArray();
    return data;
  } catch (error) {
    console.error("Error getting collection data:", error);
    throw error;
  }
}

async function addContact(contact) {
  try {
    const result = await collection.insertOne(contact);
    return { ...contact, _id: result.insertedId };
  } catch (error) {
    console.error("Error adding contact:", error);
    throw error;
  }
}

async function updateContact(id, updatedContact) {
  try {
    const { _id, ...updateData } = updatedContact;
    console.log("Updating contact with ID:", id);
    console.log("Updated contact data:", updateData);
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    console.log("Update result:", result);
    return result.modifiedCount > 0 ? { _id: id, ...updateData } : null;
  } catch (error) {
    console.error("Error updating contact:", error);
    throw error;
  }
}

async function deleteContact(id) {
  try {
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  } catch (error) {
    console.error("Error deleting contact:", error);
    throw error;
  }
}

app.get("/api/user", async (req, res) => {
  try {
    const data = await getCollectionData();
    res.json(data);
  } catch (error) {
    console.error("GET /api/user error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user", upload.single("picture"), async (req, res) => {
  try {
    const newContact = {
      ...req.body,
      picture: req.file ? `/uploads/${req.file.filename}` : "",
    };
    console.log("Received new contact:", newContact);
    const addedContact = await addContact(newContact);
    res.status(201).json(addedContact);
  } catch (error) {
    console.error("POST /api/user error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/user/:id", upload.single("picture"), async (req, res) => {
  try {
    const id = req.params.id;
    const updatedContact = {
      ...req.body,
      picture: req.file ? `/uploads/${req.file.filename}` : req.body.picture,
    };
    console.log("Updating contact with id:", id, updatedContact);
    const result = await updateContact(id, updatedContact);
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: "Contact not found" });
    }
  } catch (error) {
    console.error("PUT /api/user/:id error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/user/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log("Deleting contact with id:", id);
    const result = await deleteContact(id);
    if (result) {
      res.status(204).send(); // No content
    } else {
      res.status(404).json({ error: "Contact not found" });
    }
  } catch (error) {
    console.error("DELETE /api/user/:id error:", error);
    res.status(500).json({ error: error.message });
  }
});

initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server running at ${port}`);
  });
});
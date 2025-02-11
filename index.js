const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
var jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

// middleWare
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3umb5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // data collections from db
    const userCollection = client.db("bistroDb").collection("users");
    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewCollection = client.db("bistroDb").collection("reviews");
    const cartCollection = client.db("bistroDb").collection("carts");

    // jwt token related Api create token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      res.send({ token });
    });

    // middleWare for token verify
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        function (err, decoded) {
          if (err) {
            return res.status(401).send({ message: "unauthorized access" });
          }
          req.decoded = decoded;
          next();
        }
      );
    };

    // use verify admin after verify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // use info data
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      console.log("inside verifyToken", req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", async(req, res) => {
      const email= req.params.email
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query = {email: email}
      const user = await userCollection.findOne(query)
      let admin = false
      if(user){
        admin = user?.role === 'admin'
      }
      res.send({admin})
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // if user already have
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // make a admin
    app.patch("/users/admin/:id", verifyAdmin, verifyToken, (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = userCollection.updateOne(filter, updatedDoc);
    });
    // delete user
    app.delete("/users/:id", verifyAdmin, verifyToken, (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = userCollection.deleteOne(query);
      res.send(result);
    });
    // menu data
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    // cart collection
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("bistro is sitting");
});

app.listen(port, () => {
  console.log(`Bistro Boss is Sitting on ${port}`);
});

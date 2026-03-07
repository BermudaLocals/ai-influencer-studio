const express = require("express");
const router = express.Router();

// NOTE: If you have an addonsController, import it here. 
// For now, we'll use a placeholder to stop the crashing.
router.get("/", async (req, res) => {
    try {
        res.json({ message: "Addons route working", data: [] });
    } catch (error) {
        console.error("Addons Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;

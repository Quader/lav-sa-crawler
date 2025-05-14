# NeDB Implementation for Fishing Exam Crawler

This version of the fishing exam crawler uses NeDB instead of MongoDB for data storage. NeDB is a lightweight, file-based database that is perfect for small to medium applications running on resource-constrained devices like the Raspberry Pi.

## What is NeDB?

NeDB is an embedded database for Node.js that provides a MongoDB-like API but stores data in files on disk. It's perfect for small to medium applications and has no external dependencies.

Key Features:
- MongoDB-like API (a subset of MongoDB's API)
- Persistence to disk with automatic loading
- In-memory mode available for testing
- No server required
- Lightweight (only 9 additional packages)
- JavaScript-only implementation
- Works well on Raspberry Pi

## Implementation Details

### Files Added/Modified

1. **nedbAppointmentStorage.js**
   - Replaced mongoAppointmentStorage.js functionality with NeDB
   - Maintains the same API for backward compatibility
   - Handles file creation and directory setup automatically

2. **nedb-appointment-storage.test.js**
   - Test suite for the NeDB implementation
   - Uses in-memory database for testing

3. **migrate-to-nedb.js**
   - Migration script to transfer data from JSON to NeDB
   - Creates a backup of the original JSON file

4. **main.js**
   - Updated to use nedbAppointmentStorage instead of mongoAppointmentStorage

5. **docker-compose.yml**
   - Simplified to remove MongoDB and MongoDB Express containers
   - Retained volume mounting for persistence

### Key Differences from MongoDB Implementation

1. **Persistence**
   - NeDB stores data in a single file (appointments.db) in the data directory
   - No separate database server required

2. **Query Performance**
   - NeDB is optimized for smaller datasets (thousands of documents)
   - For larger datasets, performance may degrade compared to MongoDB

3. **Concurrency**
   - NeDB has limited concurrency support compared to MongoDB
   - Works well for single-process applications

4. **API Compatibility**
   - NeDB implements a subset of MongoDB's API
   - Our implementation maintains the same API as the MongoDB version

## How to Use

1. **Installation**
   No additional setup is required beyond the original application dependencies. NeDB is installed as a regular npm dependency.

2. **Migration**
   If you're migrating from the JSON-based storage, run:
   ```
   node migrate-to-nedb.js
   ```

3. **Running the Application**
   ```
   node main.js
   ```
   or using Docker:
   ```
   docker-compose up -d
   ```

## Testing

To run the NeDB storage tests:
```
node tests/nedb-appointment-storage.test.js
```

## Directories and Files

- `/data/appointments.db` - The NeDB database file
- `/modules/data/nedbAppointmentStorage.js` - The NeDB storage implementation
- `/tests/nedb-appointment-storage.test.js` - Tests for the NeDB implementation
- `/migrate-to-nedb.js` - Migration script from JSON to NeDB

## Advantages for Raspberry Pi

1. **Reduced Resource Usage**
   - No separate MongoDB process running
   - Lower memory footprint
   - No ARM compatibility issues

2. **Simplified Setup**
   - No need to install and configure MongoDB
   - No need to manage a separate database server
   - Single-process application

3. **Easy Backup and Migration**
   - Database is a single file that can be easily backed up
   - Simple migration path from JSON storage
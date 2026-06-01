/**
 * Load Deduplication Utility
 * 
 * Prevents duplicate loads from being saved to the database
 * A load is considered a duplicate if it has the same:
 * - branchId
 * - companyId (if provided)
 * - truckId (if provided)
 * - pickup location
 * - dropoff location
 * - load date
 * - grossAmount/loadAmount
 */

const prisma = require("./prisma");

/**
 * Check if a load already exists in the database
 * @param {Object} loadData - The load data to check
 * @returns {Promise<Object|null>} - Returns the existing load or null
 */
const findDuplicateLoad = async (loadData) => {
  try {
    const {
      branchId,
      companyId,
      truckId,
      pickup,
      dropoff,
      loadDate,
      pickupDate,
      grossAmount,
      loadAmount
    } = loadData;

    // Use loadDate or pickupDate for comparison
    const dateToCheck = loadDate || pickupDate;
    if (!dateToCheck) return null;

    // Build the where clause - check for matching loads
    const existingLoad = await prisma.load.findFirst({
      where: {
        branchId: Number(branchId),
        ...(companyId && { companyId: Number(companyId) }),
        ...(truckId && { truckId: Number(truckId) }),
        pickup: pickup?.trim(),
        dropoff: dropoff?.trim(),
        // Check if loadDate or pickupDate matches (within the same day)
        loadDate: {
          gte: new Date(new Date(dateToCheck).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(dateToCheck).setHours(23, 59, 59, 999))
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return existingLoad || null;
  } catch (error) {
    console.error("Error checking for duplicate load:", error);
    return null;
  }
};

/**
 * Create a load safely - only if it doesn't already exist
 * @param {Object} loadData - The load data to save
 * @returns {Promise<Object>} - Returns {success, load, isDuplicate, message}
 */
const createLoadSafely = async (loadData) => {
  try {
    // Check for existing load
    const existingLoad = await findDuplicateLoad(loadData);

    if (existingLoad) {
      return {
        success: false,
        load: existingLoad,
        isDuplicate: true,
        message: `Load already exists (ID: ${existingLoad.id}). Skipped to prevent duplication.`
      };
    }

    // Create the new load
    const newLoad = await prisma.load.create({
      data: loadData
    });

    return {
      success: true,
      load: newLoad,
      isDuplicate: false,
      message: "Load created successfully"
    };
  } catch (error) {
    console.error("Error creating load safely:", error);
    return {
      success: false,
      load: null,
      isDuplicate: false,
      message: error.message || "Error creating load"
    };
  }
};

/**
 * Create multiple loads safely - skips duplicates
 * @param {Array} loadsData - Array of load data to save
 * @returns {Promise<Object>} - Returns {created: [], duplicates: [], errors: []}
 */
const createLoadsSafely = async (loadsData) => {
  const results = {
    created: [],
    duplicates: [],
    errors: []
  };

  for (const loadData of loadsData) {
    const result = await createLoadSafely(loadData);

    if (result.success) {
      results.created.push(result.load);
    } else if (result.isDuplicate) {
      results.duplicates.push({
        load: result.load,
        message: result.message
      });
    } else {
      results.errors.push({
        data: loadData,
        message: result.message
      });
    }
  }

  return results;
};

module.exports = {
  findDuplicateLoad,
  createLoadSafely,
  createLoadsSafely
};

const { WasteType } = require('../models/index');

// Calculate CO2 reduction and points for a completed pickup
exports.calculateAndAwardPoints = async (pickup) => {
  let totalPoints = 0;
  let totalCarbonReduced = 0;

  for (const item of pickup.items) {
    const wasteType = item.wasteType;
    const weight = (item.actualWeight || item.estimatedWeight || 0) * (item.quantity || 1);

    if (weight > 0 && wasteType) {
      const carbonFactor = wasteType.carbonEmissionFactor || 1.5; // kg CO2e per kg
      const pointsPerKg = wasteType.pointsPerKg || 10;

      const carbonReduced = weight * carbonFactor;
      const points = Math.floor(weight * pointsPerKg);

      totalCarbonReduced += carbonReduced;
      totalPoints += points;
    }
  }

  // Bonus for heavy loads
  if (pickup.totalActualWeight > 10) totalPoints = Math.floor(totalPoints * 1.1);
  if (pickup.totalActualWeight > 25) totalPoints = Math.floor(totalPoints * 1.2);

  return {
    points: Math.max(totalPoints, 5), // minimum 5 points
    carbonReduced: totalCarbonReduced
  };
};

// Estimate points before pickup is scheduled
exports.estimatePoints = async (items) => {
  let totalPoints = 0;
  let totalCarbon = 0;
  const breakdown = [];

  for (const item of items) {
    const wasteType = await WasteType.findById(item.wasteTypeId);
    if (!wasteType) continue;

    const weight = (item.estimatedWeight || wasteType.avgWeightKg || 1) * (item.quantity || 1);
    const carbonReduced = weight * (wasteType.carbonEmissionFactor || 1.5);
    const points = Math.floor(weight * (wasteType.pointsPerKg || 10));

    totalPoints += points;
    totalCarbon += carbonReduced;
    breakdown.push({
      wasteType: wasteType.name,
      quantity: item.quantity,
      estimatedWeight: weight,
      estimatedPoints: points,
      estimatedCarbonReduction: carbonReduced.toFixed(2)
    });
  }

  return {
    totalEstimatedPoints: totalPoints,
    totalEstimatedCarbonReduction: totalCarbon.toFixed(2),
    treesEquivalent: exports.carbonToTrees(totalCarbon),
    breakdown
  };
};

// Convert carbon reduced (kg CO2e) to trees
exports.carbonToTrees = (carbonKg) => {
  // Average tree absorbs ~21 kg CO2/year
  return (carbonKg / 21).toFixed(2);
};

// Convert carbon to km not driven
exports.carbonToKmNotDriven = (carbonKg) => {
  // Average car emits ~0.21 kg CO2 per km
  return Math.floor(carbonKg / 0.21);
};

// User gamification levels
exports.getUserLevel = (points) => {
  if (points < 100) return { name: 'Eco Starter', badge: '🌱', tier: 1 };
  if (points < 500) return { name: 'Green Warrior', badge: '♻️', tier: 2 };
  if (points < 1500) return { name: 'Earth Defender', badge: '🌍', tier: 3 };
  if (points < 5000) return { name: 'Climate Champion', badge: '⚡', tier: 4 };
  return { name: 'Planet Guardian', badge: '🏆', tier: 5 };
};

exports.nextLevelPoints = (currentPoints) => {
  const thresholds = [100, 500, 1500, 5000, Infinity];
  const next = thresholds.find(t => t > currentPoints);
  return next === Infinity ? null : next - currentPoints;
};

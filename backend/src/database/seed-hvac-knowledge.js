const HVACKnowledgeBase = require('../ai/knowledge-base');
const logger = require('../utils/logger');

/**
 * Seed HVAC Knowledge Base with Canadian-focused content
 */
async function seedHVACKnowledge() {
  const knowledgeBase = new HVACKnowledgeBase();
  
  const hvacKnowledgeEntries = [
    // CSA Standards and Codes
    {
      topic: 'CSA B52 Mechanical Refrigeration Code Overview',
      category: 'codes_standards',
      content: `CSA B52 is the Canadian standard for mechanical refrigeration systems. Key requirements include:

1. Installation Standards: All refrigeration systems must meet CSA B52 installation requirements including proper clearances, ventilation, and structural support.

2. Safety Requirements: Emergency controls, pressure relief devices, and ventilation systems must be installed per CSA specifications.

3. Refrigerant Handling: All refrigerant handling must follow CSA B52 guidelines for recovery, recycling, and disposal.

4. Documentation: Installation certificates and maintenance records must be kept as required by provincial authorities.

5. Updates: CSA B52 is updated regularly - technicians should stay current with the latest revisions affecting their work.

Key differences from US standards: CSA B52 has specific cold climate considerations not found in ASHRAE standards, including requirements for extreme temperature operation and ice formation prevention.`,
      canadian_specific: true,
      safety_related: true,
      difficulty_level: 4,
      source_type: 'manual',
      tags: ['csa-b52', 'canadian-code', 'refrigeration', 'standards'],
      keywords: ['CSA B52', 'mechanical refrigeration', 'Canadian standard', 'installation requirements', 'safety requirements']
    },

    {
      topic: 'Heat Pump Operation in Canadian Winter Conditions',
      category: 'heating_systems',
      content: `Heat pump operation in Canadian winters requires special considerations:

1. Temperature Thresholds: Most air-source heat pumps lose efficiency below -15°C. Ground-source systems maintain efficiency but may have frozen loop issues.

2. Defrost Cycles: In Canadian climates, defrost cycles occur every 30-90 minutes when outdoor temperatures are between -1°C and 5°C with high humidity.

3. Auxiliary Heat: Backup heating (electric strips or gas) typically engages below -10°C to -15°C depending on system sizing and building load.

4. Cold Climate Heat Pumps: Modern cold climate heat pumps (CCHP) can operate efficiently to -25°C or lower, making them viable across most of Canada.

5. Installation Considerations: Outdoor units need elevated mounting to prevent snow blockage, and refrigerant lines require additional insulation to prevent freezing.

6. Maintenance: Pre-winter maintenance includes checking defrost sensors, auxiliary heat operation, and ensuring proper refrigerant charge for cold weather performance.

Performance tip: A properly sized and maintained heat pump should provide 50% of heating capacity at -8.3°C (17°F) per AHRI rating standards.`,
      canadian_specific: true,
      safety_related: false,
      difficulty_level: 3,
      source_type: 'manual',
      tags: ['heat-pump', 'winter-operation', 'canadian-climate', 'cold-climate'],
      keywords: ['heat pump', 'Canadian winter', 'cold climate', 'defrost cycle', 'auxiliary heat']
    },

    {
      topic: 'Superheat and Subcooling Calculation for Canadian Technicians',
      category: 'refrigeration',
      content: `Proper superheat and subcooling calculations are essential for system diagnosis:

SUPERHEAT CALCULATION:
1. Measure suction line temperature at the outdoor unit
2. Find saturation temperature using suction pressure and PT chart
3. Superheat = Suction Line Temperature - Saturation Temperature

Target Values (R-410A systems):
- Cooling: 8-12°C superheat (typically 10°C)
- Heating: 15-25°C superheat (varies with outdoor temperature)

SUBCOOLING CALCULATION:
1. Measure liquid line temperature at outdoor unit
2. Find saturation temperature using high-side pressure
3. Subcooling = Saturation Temperature - Liquid Line Temperature

Target Values:
- Most systems: 8-12°C subcooling
- TXV systems: 10-15°C subcooling

CANADIAN CONSIDERATIONS:
- Use metric measurements (°C and kPa, not °F and psi)
- Outdoor ambient temperature affects target values significantly
- Winter heating mode requires different target values than summer cooling

TROUBLESHOOTING:
- High superheat = low refrigerant or restricted TXV
- Low superheat = overcharge or TXV hunting
- High subcooling = overcharge or restricted liquid line
- Low subcooling = undercharge or liquid line restrictions

Always take measurements after system has run for 15+ minutes to stabilize.`,
      canadian_specific: true,
      safety_related: false,
      difficulty_level: 3,
      source_type: 'manual',
      tags: ['superheat', 'subcooling', 'refrigeration', 'diagnosis', 'metric'],
      keywords: ['superheat', 'subcooling', 'saturation temperature', 'refrigerant', 'troubleshooting']
    },

    {
      topic: 'HVAC Electrical Safety - Lockout/Tagout Procedures',
      category: 'safety_procedures',
      content: `Proper lockout/tagout (LOTO) procedures are mandatory for HVAC electrical work:

LOCKOUT/TAGOUT PROCEDURE:
1. IDENTIFY: Locate all energy sources (electrical, pneumatic, stored energy)
2. NOTIFY: Inform affected personnel of maintenance shutdown
3. SHUTDOWN: Use normal operating controls to shut down equipment
4. ISOLATE: Physically disconnect from energy source using disconnect switch
5. LOCKOUT: Apply personal lock to energy isolation device
6. TAGOUT: Attach warning tag with your name, date, and reason
7. TEST: Verify isolation by testing with meter and attempting startup
8. TEST YOUR TESTER: Verify meter works before and after testing

CANADIAN REQUIREMENTS:
- Provincial OH&S regulations require LOTO procedures
- Personal locks must be used (never share locks)
- Tags must include name, date, department, and expected duration
- Multi-person lockout requires group lockbox procedures

COMMON HVAC HAZARDS:
- 240V/480V electrical systems can be lethal
- Stored energy in capacitors remains dangerous after power off
- Multiple electrical feeds (outdoor unit, air handler, thermostat)
- Gas valves and controls require separate isolation

TESTING REQUIREMENTS:
- Always test with known working meter
- Check hot-to-ground, hot-to-neutral, and neutral-to-ground
- Test meter on known live circuit before and after work
- Never assume disconnect switch actually disconnects power

Remember: No job is so urgent that you can't take 30 seconds to test properly. Your family wants you home safe.`,
      canadian_specific: true,
      safety_related: true,
      difficulty_level: 2,
      source_type: 'manual',
      tags: ['electrical-safety', 'lockout-tagout', 'safety-procedure', 'canadian-regulation'],
      keywords: ['lockout tagout', 'electrical safety', 'LOTO', 'energy isolation', 'safety procedure']
    },

    {
      topic: 'R-410A Refrigerant Handling and Recovery in Canada',
      category: 'refrigeration',
      content: `Proper R-410A handling is required by Canadian environmental regulations:

CANADIAN REGULATIONS:
- Federal Halocarbon Regulations require certified technicians for refrigerant work
- All refrigerant must be recovered - venting is illegal and subject to fines up to $1 million
- Recovery equipment must meet AHRI 740 standard
- Refrigerant cylinders must be Transport Canada certified

R-410A CHARACTERISTICS:
- Operating pressures: 2.4-2.8 MPa (350-400 psi) higher than R-22
- Near-azeotropic blend - remove as liquid when possible
- Non-ozone depleting but high global warming potential (GWP 2088)
- Requires polyol ester (POE) oil - not compatible with mineral oil

RECOVERY PROCEDURES:
1. Connect recovery unit to both liquid and vapor service ports
2. Start with liquid recovery for faster process
3. Switch to vapor-only recovery when liquid stops flowing
4. Recover to 102 kPa (15" Hg) vacuum minimum
5. Label recovered refrigerant with date, system type, and technician ID

SYSTEM SERVICING:
- Always recover refrigerant before opening system
- Use proper manifold gauges rated for R-410A pressures
- Nitrogen pressure test to 4.1 MPa (600 psi) maximum
- Evacuate to 500 microns or better before charging
- Charge by weight using manufacturer specifications

ENVIRONMENTAL RESPONSIBILITY:
Recovery protects the environment and is legally required in Canada. Proper handling demonstrates professional competence and environmental stewardship.`,
      canadian_specific: true,
      safety_related: true,
      difficulty_level: 3,
      source_type: 'manual',
      tags: ['r410a', 'refrigerant-recovery', 'canadian-regulation', 'environmental'],
      keywords: ['R-410A', 'refrigerant recovery', 'Canadian regulations', 'environmental protection', 'halocarbon']
    },

    {
      topic: 'Customer Communication - Explaining HVAC Issues Simply',
      category: 'customer_service',
      content: `Effective customer communication builds trust and prevents misunderstandings:

COMMUNICATION PRINCIPLES:
1. Use simple, non-technical language
2. Explain the "why" behind recommendations
3. Use visual aids when possible (show the customer the problem)
4. Give customers realistic expectations
5. Always prioritize safety in explanations

COMMON SCENARIOS:

"System Not Cooling Enough":
- "Your air conditioner is working, but it's working much harder than it should"
- Show temperature readings: "It should be 20°C colder across the coil, but we're only seeing 12°C"
- Explain impact: "This means higher bills and shorter equipment life"

"Need Expensive Repair":
- Present options, not ultimatums: "Here are three ways we can solve this..."
- Explain consequences of delaying: "If we don't fix this, here's what could happen..."
- Use analogies: "It's like your car engine running without oil"

"Preventive Maintenance":
- Focus on benefits: "This keeps your system running efficiently and prevents emergency breakdowns"
- Use seasonal relevance: "Before winter hits, we want to make sure your heating system is ready"

BUILDING TRUST:
- Always show your work and explain findings
- Take photos of problems when appropriate
- Provide written estimates and explanations
- Follow up after repairs to ensure satisfaction

MANAGING EXPECTATIONS:
- Be honest about timeline and costs
- Explain warranty terms clearly
- Set realistic temperature expectations (system can't cool to 18°C when it's 35°C outside)

Remember: Customers hire us to solve problems, not just fix equipment. Clear communication is part of the solution.`,
      canadian_specific: false,
      safety_related: false,
      difficulty_level: 2,
      source_type: 'manual',
      tags: ['customer-service', 'communication', 'trust-building', 'expectations'],
      keywords: ['customer communication', 'explaining HVAC', 'building trust', 'service calls']
    },

    {
      topic: 'Heat Recovery Ventilator (HRV) Installation and Setup',
      category: 'ventilation',
      content: `HRVs are essential for Canadian homes with tight building envelopes:

HRV PURPOSE:
- Provides fresh air while recovering heat from exhaust air
- Required by Canadian building codes in most new construction
- Reduces indoor humidity and pollutants
- Maintains indoor air quality without significant heat loss

INSTALLATION REQUIREMENTS:
1. Location: Install in conditioned space (basement or utility room)
2. Drainage: Condensate drain must be connected to floor drain or pump
3. Electrical: 115V dedicated circuit, typically 3-5 amps
4. Ductwork: Separate fresh air and stale air ducts required
5. Controls: Wall control or connection to HVAC system controls

DUCTWORK DESIGN:
- Fresh air supply to bedrooms and living areas
- Stale air exhaust from bathrooms, kitchen, laundry
- 6" minimum duct size for main runs
- Insulate ducts in unconditioned spaces to prevent condensation
- Install backdraft dampers on both supply and exhaust

BALANCING PROCEDURE:
1. Set HRV to high speed
2. Measure supply and exhaust airflows
3. Adjust dampers to balance within 10% of each other
4. Check static pressures don't exceed manufacturer limits
5. Program controls for continuous or intermittent operation

SEASONAL OPERATION:
- Winter: Heat recovery mode, may require defrost cycle
- Summer: In most Canadian climates, bypass heat exchanger for free cooling
- Spring/Fall: Normal heat recovery operation

MAINTENANCE REQUIREMENTS:
- Clean or replace filters every 3-6 months
- Clean heat exchanger core annually
- Check and clean condensate drain
- Inspect ductwork for leaks or blockages

HRV efficiency ratings in Canada typically range from 55-95% heat recovery effectiveness.`,
      canadian_specific: true,
      safety_related: false,
      difficulty_level: 3,
      source_type: 'manual',
      tags: ['hrv', 'heat-recovery', 'ventilation', 'canadian-codes', 'air-quality'],
      keywords: ['HRV', 'heat recovery ventilator', 'fresh air', 'ventilation', 'Canadian building codes']
    },

    {
      topic: 'Troubleshooting Gas Furnace Ignition Systems',
      category: 'heating_systems',
      content: `Modern gas furnaces use either hot surface ignition (HSI) or intermittent pilot ignition:

HOT SURFACE IGNITION TROUBLESHOOTING:
1. Check for 24V to ignition control board
2. Verify igniter draws current (typically 3-4 amps for silicon carbide, 0.5 amps for silicon nitride)
3. Observe igniter glow - should be bright orange/white
4. Check flame sensor for proper flame signal (typically 0.5-10 microamps DC)
5. Verify gas valve operation and proper gas pressure

COMMON HSI PROBLEMS:
- Cracked igniter: No glow or intermittent operation
- Dirty flame sensor: Igniter glows, gas lights, then shuts off after 3-7 seconds
- Failed control board: No 24V output or improper timing sequence
- Gas valve issues: Improper inlet pressure (should be 3.5" WC for natural gas)

INTERMITTENT PILOT TROUBLESHOOTING:
1. Check 24V to pilot valve
2. Verify spark at pilot burner (blue spark every 1-2 seconds)
3. Check pilot flame adjustment and thermocouple/thermopile signal
4. Verify main valve opens after pilot establishment

SAFETY CONSIDERATIONS:
- Always check for gas leaks using soap solution or electronic detector
- Verify proper venting and combustion air supply
- Check heat exchanger for cracks or damage
- Ensure proper grounding of gas piping
- Test carbon monoxide levels in flue and living space

CANADIAN CONSIDERATIONS:
- Natural gas pressure: 3.5" WC (875 Pa)
- Propane pressure: 11" WC (2.74 kPa)
- Venting must comply with CSA B149 installation code
- Combustion air requirements per Canadian building codes

SEQUENCE OF OPERATION:
1. Thermostat calls for heat
2. Draft inducer starts and proves airflow
3. Igniter energizes and heats to ignition temperature
4. Gas valve opens and ignites
5. Flame sensor proves flame presence
6. Main blower starts after heat-up delay

Always follow manufacturer troubleshooting procedures and local gas codes.`,
      canadian_specific: true,
      safety_related: true,
      difficulty_level: 3,
      source_type: 'manual',
      tags: ['gas-furnace', 'ignition', 'troubleshooting', 'safety', 'canadian-codes'],
      keywords: ['gas furnace', 'hot surface ignition', 'flame sensor', 'troubleshooting', 'safety']
    }
  ];

  logger.info('Starting HVAC knowledge base seeding...');

  try {
    const importResult = await knowledgeBase.bulkImport(hvacKnowledgeEntries);
    
    logger.info('HVAC knowledge base seeding completed', {
      totalEntries: hvacKnowledgeEntries.length,
      successful: importResult.successful,
      failed: importResult.failed
    });

    if (importResult.errors.length > 0) {
      logger.warn('Some knowledge entries failed to import:', importResult.errors);
    }

    return importResult;

  } catch (error) {
    logger.error('HVAC knowledge base seeding failed:', error);
    throw error;
  }
}

// Export both the function and execute if run directly
if (require.main === module) {
  seedHVACKnowledge()
    .then(result => {
      console.log('Seeding completed successfully:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedHVACKnowledge;
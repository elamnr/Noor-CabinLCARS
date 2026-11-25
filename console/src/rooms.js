// Room definitions. Each mirrors one Lovelace tablet dashboard in Retro House.
export const SHARED = {
  visitor: 'binary_sensor.retro_front_door_visitor',
  camera: 'camera.retro_front_door_clear',
  garage: 'cover.ratgdov25i_4bfba4_door',
  garageObs: 'binary_sensor.ratgdov25i_4bfba4_obstruction',
  // Music Assistant players any console can drive (label, entity). Fire Room Bose = the MA entity, not the Bose integration's.
  music: ['media_player.bedroom_2', 'media_player.vr_room', 'media_player.kitchen', 'media_player.bathroom', 'media_player.dax_s_room', 'media_player.fire_room_bose', 'media_player.retro_whole_house'],
  // console reload helpers: _all reloads every console (pressed by the deploy automation), _kitchen the kitchen TV only
  reload: ['input_button.cabin_lcars_reload_all', 'input_button.cabin_lcars_reload_kitchen'],
  doors: ['binary_sensor.front_door_contact_input', 'binary_sensor.kitchen_entry_contact_input', 'binary_sensor.garage_entry_contact_input', 'binary_sensor.fire_room_entry_contact_input'],
};

export const ROOMS = {
  // source: dashboard "bedroom-dashboard"
  bedroom: {
    key: 'bedroom',
    title: 'PRIMARY BED',
    lights: 'light.master_bed',
    lightMembers: ['light.hue_color_lamp_1_5', 'light.bookshelf', 'light.elam_desk_1', 'light.nightstand', 'light.elam_desk_2', 'light.tv_lamp'],
    lightScenes: [
      ['BRIGHT', 'scene.master_bed_bright'], ['READ', 'scene.master_bed_read'], ['CONCENTRATE', 'scene.master_bed_concentrate'], ['ENERGIZE', 'scene.master_bed_energize'],
      ['RELAX', 'scene.master_bed_relax'], ['DIMMED', 'scene.master_bed_dimmed'], ['TOKYO', 'scene.master_bed_tokyo'], ['NIGHT', 'scene.primary_bed_nightlight'],
    ],
    blinds: { group: 'cover.primary_bed_blinds', members: [['UNIT 1', 'cover.blind_primary_bed_1'], ['UNIT 2', 'cover.blind_primary_bed_2'], ['UNIT 3', 'cover.blind_primary_bed_3']] },
    fan: 'fan.fan',
    hvac: 'climate.retro_house_upstairs',
    media: [['BEDROOM', 'BEDROOM TV', 'media_player.bedroom', 'violet'], ['FIRE ROOM', 'FIRE ROOM APPLE TV', 'media_player.fire_room', 'peach']],
    mainMedia: 'media_player.bedroom',
    commands: [
      { kind: 'press', label: 'DAX STOP AUDIO', id: 'input_button.dax_stop_audio_ha', tone: 'cool' },
      { kind: 'press', label: 'DAX QUIET', id: 'input_button.dax_quiet_button_ha', tone: 'cool' },
      { kind: 'toggle', label: 'NIGHTLIGHT', id: 'light.sonoff_10021a5310' },
      { kind: 'press', label: 'GOODNIGHT', id: 'input_button.goodnight_ha', tone: 'cool' },
      { kind: 'press', label: 'A WHOLE MOOD', id: 'input_button.sexy_time_ha' },
      { kind: 'press', label: 'IM BEING BLINDED', id: 'scene.im_being_blinded' },
    ],
    calendar: null,
    vehicles: ['raichu', 'tessie'], vehicleMode: 'night', // vehicle summary on COMMANDS
    musicDefault: 'media_player.bedroom_2', // MEDIA > MUSIC starts on the bedroom Alexa
    pages: ['MAIN', 'MEDIA', 'ILLUMINATION', 'ENVIRON', 'COMMANDS', 'SECURITY'],
  },
  // source: dashboard "office-tablet" (VR Room)
  office: {
    key: 'office',
    title: 'OFFICE',
    mainLayout: 'agenda',
    lights: 'light.vr_room',
    lightMembers: ['light.vr_under_couch_2', 'light.plant_wall', 'light.hue_color_lamp_1_4', 'light.vr_strip', 'light.vr_corner', 'light.vr_under_couch_1', 'light.hue_color_lamp_2'],
    lightScenes: [
      ['BRIGHT', 'scene.vr_room_bright'], ['RELAX', 'scene.vr_room_relax'], ['DIMMED', 'scene.vr_room_dimmed'], ['TOKYO', 'scene.vr_room_tokyo'],
      ['BLUE PLANET', 'scene.vr_room_blue_planet'], ['COLOR BURST', 'scene.vr_room_color_burst'], ['RUBY ROMANCE', 'scene.vr_room_ruby_romance'],
    ],
    // No working group: the console drives the three shades together.
    blinds: { group: null, members: [['LEFT', 'cover.blind_vr_room_left'], ['RIGHT', 'cover.blind_vr_room_right'], ['LARGE', 'cover.vr_room_large_blind']] },
    fan: null,
    hvac: 'climate.retro_house_upstairs',
    media: [['FIRE ROOM', 'FIRE ROOM APPLE TV', 'media_player.fire_room', 'peach']],
    mainMedia: 'media_player.fire_room',
    commands: [
      { kind: 'toggle', label: 'ADAPTIVE LIGHTING', id: 'switch.adaptive_lighting_retro_house_adaptive_lighting', sub: 'HOUSE' },
      { kind: 'toggle', label: 'PLANT WALL', id: 'light.plant_wall_grow_light_thirdreality', sub: 'GROW LIGHT' },
      { kind: 'toggle', label: 'WINDOW PLANTS', id: 'switch.autowater_officewindow', sub: 'AUTO WATER' },
      { kind: 'toggle', label: 'WORKDESK LAMP', id: 'switch.on_off_module_36_6d_eb', sub: 'OUTLETLINC' },
      { kind: 'toggle', label: 'BUBBLE CLOCK', id: 'switch.sonoff_10017fff5e_1', sub: 'SONOFF' },
      { kind: 'toggle', label: 'AWAY MODE', id: 'input_boolean.away_mode', sub: 'HOUSE' },
      { kind: 'press', label: 'FIND TRICORDER', id: 'input_button.find_tricorder', tone: 'warn' },
      { kind: 'press', label: 'VR ROOM BRIGHT', id: 'scene.vr_room_bright', tone: 'cool' },
      { kind: 'press', label: 'HOUSE BRIGHT', id: 'scene.whole_house_lights_bright', tone: 'cool' },
      { kind: 'press', label: 'HOUSE TOKYO', id: 'scene.whole_house_lights_tokyo', tone: 'cool' },
    ],
    calendar: {
      focus: 'binary_sensor.retroha_calendar_ipad_focus',
      cals: [['PERSONAL', 'calendar.elam_personal', 'peach'], ['916', 'calendar.elam_noor_916', 'violet']],
      block: /(😎 Buffer|💪 Exercise|blank|Apple Workout)/,
      days: 7,
    },
    musicDefault: 'media_player.vr_room', // MEDIA > MUSIC starts on the VR Room Alexa
    vehicles: ['raichu', 'tessie'], vehicleCompact: true, // VEHICLES page uses the compact (portrait) vehicle view
    pages: ['MAIN', 'MEDIA', 'ILLUMINATION', 'ENVIRON', 'COMMANDS', 'SCHEDULE', 'SECURITY', 'VEHICLES'],
  },
};

ROOMS.entry = {
  // source: dashboard "basement-entry"
  key: 'entry',
  title: 'BASEMENT ENTRY',
  mainLayout: 'entry',
  vehicles: ['raichu', 'tessie'], vehicleMode: 'depart', // vehicle summary on MAIN
  vehicleCompact: true, // FULL DISPLAY opens the compact vehicle view (small tablet); its own FULL DISPLAY button reaches the master systems display
  lights: 'light.entry',
  lightLabel: 'CHANDELIER',
  lightMembers: ['light.chandelier_1', 'light.chandelier_2', 'light.chandelier_3', 'light.chandelier_4', 'light.chandelier_5', 'light.hue_color_lamp_1_2', 'light.hue_color_lamp_1_3'],
  lightScenes: [['RELAX', 'scene.entry_relax'], ['GLOWING GRINS', 'scene.entry_glowing_grins']],
  blinds: null,
  fan: null,
  hvac: 'climate.retro_house_upstairs',
  media: [],
  commands: [
    { kind: 'goodbye', label: 'GOODBYE', id: 'automation.goodbye', away: 'input_boolean.away_mode' },
    { kind: 'toggle', label: 'ALL LIGHTS', id: 'light.all_lights' },
    { kind: 'toggle', label: 'PORCH LIGHTS', id: 'light.porch_lights' },
    // Chandelier bulbs only (light.entry also contains the two porch lamps)
    { kind: 'action', label: 'NIGHTLIGHT', id: 'light.chandelier_1', sub: 'CHANDELIER RED • MIN', domain: 'light', service: 'turn_on', data: { rgb_color: [255, 0, 0], brightness: 1 }, targets: ['light.chandelier_1', 'light.chandelier_2', 'light.chandelier_3', 'light.chandelier_4', 'light.chandelier_5'], tone: 'cool' },
    { kind: 'press', label: 'HOUSE TOKYO', id: 'scene.whole_house_lights_tokyo', tone: 'cool' },
  ],
  quick: { allLights: 'light.all_lights', away: 'input_boolean.away_mode', goodbye: 'automation.goodbye', allDoors: 'binary_sensor.all_doors' },
  weather: { entity: 'weather.nws_retrohouse', sun: 'sun.sun', hvacOutdoor: 'sensor.retro_house_outdoor_temperature' },
  calendar: null,
  pages: ['MAIN', 'ILLUMINATION', 'WEATHER', 'CLIMATE', 'COMMANDS', 'SECURITY'],
};

ROOMS.house = {
  // source: dashboard "surface-dashboard" (Retro House). Log Cabin thermostat omitted: cabin entities are out of scope.
  key: 'house',
  title: 'RETRO HOUSE',
  mainLayout: 'house',
  lights: 'light.main_floor_lights',
  lightLabel: 'MAIN FLOOR',
  lightMembers: ['light.vr_room', 'light.kitchen', 'light.fire_room', 'light.keypadlinc_on_off_25_6b_20_button_b', 'light.entry', 'light.on_off_module_36_6d_eb'],
  zones: [
    ['MAIN FLOOR', 'light.main_floor_lights', ['light.vr_room', 'light.kitchen', 'light.fire_room', 'light.keypadlinc_on_off_25_6b_20_button_b', 'light.entry', 'light.on_off_module_36_6d_eb']],
    ['KITCHEN', 'light.kitchen', ['light.kitchen_1', 'light.kitchen_2', 'light.kitchen_3', 'light.kitchen_4', 'light.kitchen_5', 'light.kitchen_5_real', 'light.island_1', 'light.island_2', 'light.island_3', 'light.island_4', 'light.hue_lightstrip_plus_1']],
    ['CABINET', 'light.cabinet_lights', []],
    ['FIRE ROOM', 'light.fire_room', ['light.tv1', 'light.tv2', 'light.tv3', 'light.tv4', 'light.arc_lamp', 'light.mini_arc_lamp', 'light.under_tv_strip', 'light.under_couch_1', 'light.under_couch_3', 'light.hue_play_1', 'light.hue_play_2']],
    ['VR ROOM', 'light.vr_room', ['light.vr_under_couch_2', 'light.plant_wall', 'light.hue_color_lamp_1_4', 'light.vr_strip', 'light.vr_corner', 'light.vr_under_couch_1', 'light.hue_color_lamp_2']],
    ['ENTRY', 'light.entry', ['light.chandelier_1', 'light.chandelier_2', 'light.chandelier_3', 'light.chandelier_4', 'light.chandelier_5', 'light.hue_color_lamp_1_2', 'light.hue_color_lamp_1_3']],
    ['PORCH', 'light.porch_lights', ['light.hue_color_lamp_1_2', 'light.hue_color_lamp_1_3']],
    ['GROW LIGHTS', 'light.plant_lights', ['light.bathroom_plant_bulb', 'light.arc_lamp_plant_bulb', 'light.mini_arc_plant_light_thirdreality', 'light.plant_wall_grow_light_thirdreality']],
  ],
  lightScenes: [['RELAX', 'scene.whole_house_lights_relax'], ['BRIGHT', 'scene.whole_house_lights_bright'], ['TOKYO', 'scene.whole_house_lights_tokyo'], ['KITCHEN AMBIANCE', 'scene.kitchen_ambiance']],
  blinds: null,
  fan: null,
  hvac: 'climate.retro_house_upstairs',
  media: [['BEDROOM', 'BEDROOM TV', 'media_player.bedroom', 'violet'], ['FIRE ROOM', 'FIRE ROOM APPLE TV', 'media_player.fire_room', 'peach']],
  musicDefault: 'media_player.retro_whole_house', // MEDIA > MUSIC starts on the whole-house Alexa group
  commands: [
    { kind: 'toggle', label: 'CALENDAR', id: 'input_boolean.polycaltoggle', sub: 'SCREEN' },
    { kind: 'toggle', label: 'CAMERA VIEW', id: 'input_boolean.cameratoggle', sub: 'SCREEN' },
    { kind: 'toggle', label: 'KITCHEN DISPLAY', id: 'media_player.the_frame_kitchen', sub: 'POWER' },
    { kind: 'toggle', label: 'ADAPTIVE LIGHTING', id: 'switch.adaptive_lighting_retro_house_adaptive_lighting' },
    { kind: 'toggle', label: 'GROW LIGHTS', id: 'light.plant_lights' },
    { kind: 'toggle', label: 'LARGE BLIND', id: 'cover.vr_room_large_blind', sub: 'VR ROOM' },
  ],
  weather: { entity: 'weather.nws_retrohouse', sun: 'sun.sun', hvacOutdoor: 'sensor.retro_house_outdoor_temperature' },
  climateForecast: true, // CLIMATE page shows hourly + daily forecast under OUTDOOR
  quick: { allDoors: 'binary_sensor.all_doors' },
  // Find My: input_buttons drive automation.find_my_ping_device (icloud.play_sound)
  findMy: [
    ["ELAM'S IPHONE", 'input_button.find_tricorder'],
    ["KATIE'S IPHONE", 'input_button.find_katie_s_iphone'],
    ["DAX'S IPAD", 'input_button.find_orion_s_ipad'],
    ['WORK IPAD', 'input_button.find_work_ipad'],
  ],
  calendar: null,
  vehicles: ['raichu', 'tessie'],
  pages: ['MAIN', 'MEDIA', 'ILLUMINATION', 'CLIMATE', 'SYSTEMS', 'SECURITY', 'VEHICLES'],
};

/* Tesla Fleet vehicles (VEHICLES page). Stage coordinates are in the page's fixed 1092x640 layout:
   img = where the cutaway sits; anchors = where each leader line ends on the drawing. */
/** Music Assistant: config entry for library calls, speakers in display order. */
export const MUSIC = {
  entry: '01K6Y94P78FDV9AXX6MG0EWBPC',
  // Alexa devices exposed through Music Assistant, plus the Bose soundbar's own MA player (2026-11-18 list)
  speakers: [
    ['BEDROOM', 'media_player.bedroom_2', 'ALEXA'],
    ['VR ROOM', 'media_player.vr_room', 'ALEXA'],
    ['KITCHEN', 'media_player.kitchen', 'ALEXA'],
    ['BATHROOM', 'media_player.bathroom', 'ALEXA'],
    ["DAX'S ROOM", 'media_player.dax_s_room', 'ALEXA'],
    ['SOUNDBAR', 'media_player.fire_room_bose', 'FIRE ROOM BOSE'],
    ['WHOLE HOUSE', 'media_player.retro_whole_house', 'ALEXA GROUP'],
  ],
};

export const VEHICLES = {
  raichu: {
    name: 'RAICHU', model: 'MODEL Y', tires: true,
    img: { x: 226, y: 220, w: 680, h: 254 },
    anchors: { seat: [561, 340], wheel: [501, 295], defrost: [466, 282], climate: [426, 320], frunk: [301, 335], locks: [576, 316], windows: [676, 270], trunk: [826, 305], port: [871, 315], tireF: [351, 465], battery: [564, 435], tireR: [771, 465] },
    pack: [426, 385, 272, 50],
    // From the car's vehicle_config (Tesla Fleet, 2026-10-31) and the VIN pattern; no VIN stored here.
    identity: [['MODEL YEAR', '2023'], ['TRIM', 'LONG RANGE AWD (74D)'], ['DRIVE', 'DUAL MOTOR AWD'], ['AUTOPILOT HW', 'HW4 (AP4)'], ['PAINT', 'MIDNIGHT SILVER METALLIC'], ['INTERIOR', 'WHITE'], ['WHEELS', '19 IN GEMINI (CAPS ON)'], ['ROOF', 'GLASS'], ['SEATS', '5 (THIRD ROW FLAT-FOLD)'], ['REAR DRIVE UNIT', 'PM216 MOSFET'], ['CHARGE PORT', 'NORTH AMERICA, MOTORIZED'], ['POWER LIFTGATE', 'YES'], ['BUILD PLANT', 'FREMONT, CA']],
    // Published specifications, 2023 Model Y Long Range AWD (EV Specifications; Tesla tire placard 2.9 bar from the car)
    specs: [['CURB WEIGHT', '4,363 LB'], ['LENGTH', '187.0 IN'], ['WIDTH (BODY)', '75.6 IN'], ['WIDTH (MIRRORS OUT)', '83.8 IN'], ['HEIGHT', '63.9 IN'], ['WHEELBASE', '113.8 IN'], ['GROUND CLEARANCE', '6.8 IN'], ['TURNING CIRCLE', '39.7 FT'], ['DRAG COEFFICIENT', '0.23 CD'],
      ['BATTERY (NOMINAL)', '~82 KWH'], ['CELLS', '2170 CYLINDRICAL'], ['EPA RANGE (NEW)', '330 MI'], ['0-60 MPH', '4.8 S'], ['TOP SPEED', '135 MPH'], ['POWER (COMBINED)', '425 HP / 317 KW'], ['TORQUE', '402 LB-FT'],
      ['MAX DC CHARGE', '250 KW'], ['ONBOARD AC CHARGER', '11.5 KW (48 A)'], ['TIRE SIZE', '255/45R19'], ['TIRE PRESSURE (COLD)', '42 PSI'], ['CARGO (SEATS UP)', '30.2 CU FT'], ['CARGO (MAX)', '72.1 CU FT'], ['FRUNK', '4.1 CU FT']],
  },
  tessie: {
    name: 'TESSIE', model: 'MODEL 3', tires: true,
    img: { x: 226, y: 230, w: 680, h: 241 },
    anchors: { seat: [556, 350], wheel: [496, 322], defrost: [454, 311], climate: [386, 346], frunk: [318, 326], locks: [568, 333], windows: [674, 288], trunk: [829, 308], port: [878, 324], tireF: [351, 452], battery: [564, 422], tireR: [771, 452] },
    pack: [424, 404, 254, 31],
    identity: [['MODEL YEAR', '2018'], ['TRIM', 'LONG RANGE AWD (74D)'], ['DRIVE', 'DUAL MOTOR AWD'], ['AUTOPILOT HW', 'HW3 (AP3)'], ['PAINT', 'SOLID BLACK'], ['INTERIOR', 'BLACK'], ['WHEELS', '18 IN AERO (CAP KIT)'], ['ROOF', 'GLASS'], ['EXTERIOR TRIM', 'CHROME'], ['REAR DRIVE UNIT', 'PM216 MOSFET'], ['CHARGE PORT', 'NORTH AMERICA, MOTORIZED'], ['HOMELINK DEVICES', '2'], ['BUILD PLANT', 'FREMONT, CA']],
    // Published specifications, 2018 Model 3 Long Range AWD (EV Specifications; tire placard 2.9 bar from the car)
    specs: [['CURB WEIGHT', '4,072 LB'], ['LENGTH', '184.8 IN'], ['WIDTH (BODY)', '72.8 IN'], ['WIDTH (MIRRORS OUT)', '82.2 IN'], ['HEIGHT', '56.8 IN'], ['WHEELBASE', '113.2 IN'], ['GROUND CLEARANCE', '5.5 IN'], ['TURNING CIRCLE', '38.7 FT'], ['DRAG COEFFICIENT', '0.23 CD'],
      ['BATTERY (NOMINAL)', '~78 KWH'], ['CELLS', '2170 CYLINDRICAL (PANASONIC NCA)'], ['EPA RANGE (NEW)', '310 MI'], ['0-60 MPH', '4.5 S'], ['TOP SPEED', '145 MPH'], ['POWER (COMBINED)', '425 HP / 317 KW'], ['TORQUE', '402 LB-FT'],
      ['MAX DC CHARGE', '250 KW'], ['ONBOARD AC CHARGER', '11.5 KW (48 A)'], ['TIRE SIZE', '235/45R18'], ['TIRE PRESSURE (COLD)', '42 PSI'], ['TRUNK', '12.0 CU FT'], ['FRUNK', '3.0 CU FT']],
  },
};
const DOORS = ['front_driver', 'front_passenger', 'rear_driver', 'rear_passenger'];
/* SYSTEM DETAILS groups: [label, entity id with {p} for the car prefix]. Rows whose entity HA does not report are skipped. */
export const VEH_DETAIL = [
  ['ENERGY', [['BATTERY', 'sensor.{p}_battery_level'], ['USABLE BATTERY', 'sensor.{p}_usable_battery_level'], ['RATED RANGE', 'sensor.{p}_battery_range'], ['ESTIMATED RANGE', 'sensor.{p}_estimate_battery_range'], ['IDEAL RANGE', 'sensor.{p}_ideal_battery_range'],
    ['CHARGE LIMIT', 'number.{p}_charge_limit'], ['CHARGE CURRENT SET', 'number.{p}_charge_current'], ['CHARGING', 'sensor.{p}_charging'], ['CHARGE SWITCH', 'switch.{p}_charge'], ['CHARGER POWER', 'sensor.{p}_charger_power'], ['CHARGER VOLTAGE', 'sensor.{p}_charger_voltage'],
    ['CHARGER CURRENT', 'sensor.{p}_charger_current'], ['CHARGE RATE', 'sensor.{p}_charge_rate'], ['ENERGY ADDED', 'sensor.{p}_charge_energy_added'], ['FULL AT', 'sensor.{p}_time_to_full_charge'], ['CABLE', 'binary_sensor.{p}_charge_cable'],
    ['CABLE TYPE', 'sensor.{p}_charge_cable'], ['FAST CHARGER', 'sensor.{p}_fast_charger_type'], ['MULTI-PHASE CHARGER', 'binary_sensor.{p}_charger_has_multiple_phases'], ['SCHEDULED CHARGE', 'binary_sensor.{p}_scheduled_charging_pending'], ['TRIP CHARGING', 'binary_sensor.{p}_trip_charging'], ['BATTERY HEATER', 'binary_sensor.{p}_battery_heater']]],
  ['DRIVE', [['ODOMETER', 'sensor.{p}_odometer'], ['STATUS', 'binary_sensor.{p}_status'], ['LAST CHECK-IN', 'sensor.{p}_last_check_in'], ['SHIFT STATE', 'sensor.{p}_shift_state'], ['SPEED', 'sensor.{p}_speed'], ['POWER', 'sensor.{p}_power'], ['LOCATION', 'device_tracker.{p}_location'],
    ['DESTINATION', 'sensor.{p}_destination'], ['DISTANCE TO ARRIVAL', 'sensor.{p}_distance_to_arrival'], ['ARRIVAL', 'sensor.{p}_time_to_arrival'], ['CHARGE AT ARRIVAL', 'sensor.{p}_state_of_charge_at_arrival'], ['TRAFFIC DELAY', 'sensor.{p}_traffic_delay'],
    ['DRIVER PRESENT', 'binary_sensor.{p}_user_present'], ['DASHCAM', 'binary_sensor.{p}_dashcam'], ['MEDIA', 'media_player.{p}_media_player'], ['SOFTWARE', 'update.{p}_update']]],
  ['CLIMATE', [['CABIN', 'sensor.{p}_inside_temperature'], ['OUTSIDE', 'sensor.{p}_outside_temperature'], ['CLIMATE', 'climate.{p}_climate'], ['DRIVER SETPOINT', 'sensor.{p}_driver_temperature_setting'], ['PASSENGER SETPOINT', 'sensor.{p}_passenger_temperature_setting'],
    ['OVERHEAT PROTECTION', 'climate.{p}_cabin_overheat_protection'], ['OVERHEAT COOLING', 'binary_sensor.{p}_cabin_overheat_protection_actively_cooling'], ['DEFROST', 'switch.{p}_defrost'], ['PRECONDITIONING', 'binary_sensor.{p}_preconditioning'], ['PRECONDITION SCHEDULE', 'binary_sensor.{p}_preconditioning_enabled'],
    ['SEAT FRONT L', 'select.{p}_seat_heater_front_left'], ['SEAT FRONT R', 'select.{p}_seat_heater_front_right'], ['SEAT REAR L', 'select.{p}_seat_heater_rear_left'], ['SEAT REAR C', 'select.{p}_seat_heater_rear_center'], ['SEAT REAR R', 'select.{p}_seat_heater_rear_right'],
    ['STEERING WHEEL', 'select.{p}_steering_wheel_heater'], ['AUTO SEAT L', 'switch.{p}_auto_seat_climate_left'], ['AUTO SEAT R', 'switch.{p}_auto_seat_climate_right'], ['AUTO WHEEL', 'switch.{p}_auto_steering_wheel_heater']]],
  ['BODY', [['LOCKS', 'lock.{p}_lock'], ['SENTRY', 'switch.{p}_sentry_mode'], ['DOOR FRONT L', 'binary_sensor.{p}_front_driver_door'], ['DOOR FRONT R', 'binary_sensor.{p}_front_passenger_door'], ['DOOR REAR L', 'binary_sensor.{p}_rear_driver_door'], ['DOOR REAR R', 'binary_sensor.{p}_rear_passenger_door'],
    ['WINDOW FRONT L', 'binary_sensor.{p}_front_driver_window'], ['WINDOW FRONT R', 'binary_sensor.{p}_front_passenger_window'], ['WINDOW REAR L', 'binary_sensor.{p}_rear_driver_window'], ['WINDOW REAR R', 'binary_sensor.{p}_rear_passenger_window'], ['WINDOWS', 'cover.{p}_windows'],
    ['FRUNK', 'cover.{p}_frunk'], ['TRUNK', 'cover.{p}_trunk'], ['CHARGE PORT', 'cover.{p}_charge_port_door'], ['CABLE LOCK', 'lock.{p}_charge_cable_lock'], ['SUNROOF', 'cover.{p}_sunroof']]],
  ['TIRES', [['FRONT L', 'sensor.{p}_tire_pressure_front_left'], ['FRONT R', 'sensor.{p}_tire_pressure_front_right'], ['REAR L', 'sensor.{p}_tire_pressure_rear_left'], ['REAR R', 'sensor.{p}_tire_pressure_rear_right'],
    ['WARNING FRONT L', 'binary_sensor.{p}_tire_pressure_warning_front_left'], ['WARNING FRONT R', 'binary_sensor.{p}_tire_pressure_warning_front_right'], ['WARNING REAR L', 'binary_sensor.{p}_tire_pressure_warning_rear_left'], ['WARNING REAR R', 'binary_sensor.{p}_tire_pressure_warning_rear_right']]],
];
export const detailIds = (p) => VEH_DETAIL.flatMap(([, rows]) => rows.map(([, id]) => id.replace('{p}', p)));
const TIRES = ['front_left', 'front_right', 'rear_left', 'rear_right'];
export function vehicleIds(p) {
  const t = VEHICLES[p]?.tires;
  return [
    `binary_sensor.${p}_status`, `sensor.${p}_last_check_in`, `device_tracker.${p}_location`, `update.${p}_update`,
    `sensor.${p}_battery_level`, `sensor.${p}_battery_range`, `sensor.${p}_charging`, `sensor.${p}_charger_power`,
    `sensor.${p}_time_to_full_charge`, `sensor.${p}_charge_energy_added`, `number.${p}_charge_limit`, `switch.${p}_charge`,
    `binary_sensor.${p}_charge_cable`, `cover.${p}_charge_port_door`, `cover.${p}_frunk`, `cover.${p}_trunk`, `cover.${p}_windows`,
    ...DOORS.flatMap((d) => [`binary_sensor.${p}_${d}_door`, `binary_sensor.${p}_${d}_window`]),
    `lock.${p}_lock`, `climate.${p}_climate`, `sensor.${p}_inside_temperature`, `sensor.${p}_outside_temperature`,
    `switch.${p}_defrost`, `select.${p}_seat_heater_front_left`, `select.${p}_steering_wheel_heater`,
    `switch.${p}_auto_seat_climate_left`, `switch.${p}_auto_steering_wheel_heater`, `switch.${p}_sentry_mode`,
    ...(t ? TIRES.map((x) => `sensor.${p}_tire_pressure_${x}`) : []),
    `button.${p}_wake`, `button.${p}_flash_lights`, `button.${p}_honk_horn`, `button.${p}_homelink`,
    `device_tracker.${p}_route`, `sensor.${p}_destination`, `sensor.${p}_distance_to_arrival`, `sensor.${p}_time_to_arrival`, `sensor.${p}_speed`, `sensor.${p}_shift_state`, 'zone.home',
    ...detailIds(p),
  ];
}

// source: dashboard "kitchen-display" (TV, extended desktop; display only, nobody touches it)
ROOMS.kitchen = {
  key: 'kitchen',
  title: 'KITCHEN',
  kiosk: true,
  lights: null, lightMembers: [], lightScenes: [], media: [], commands: [],
  weather: { entity: 'weather.nws_retrohouse', sun: 'sun.sun', hvacOutdoor: 'sensor.retro_house_outdoor_temperature' },
  // screen modes, switched from the house console (SYSTEMS: CALENDAR / CAMERA VIEW) or by a doorbell visitor
  modes: { calendar: 'input_boolean.polycaltoggle', camera: 'input_boolean.cameratoggle' },
  quick: { allDoors: 'binary_sensor.all_doors' },
  aiTimeline: 'calendar.llm_vision_timeline',
  // TELEMETRY panel under the forecast (standard mode): live readings drawn as LCARS bar meters
  telemetry: {
    hvac: 'climate.retro_house_upstairs',
    freezer: 'sensor.retro_freezer_thermostat_temperature_probe',
    cars: [['RAICHU', 'sensor.raichu_battery_level'], ['TESSIE', 'sensor.tessie_battery_level']],
  },
  // [label, calendar, tone, hide-regex] (filters carried over from the old cards)
  elam: [['916', 'calendar.elam_noor_916', 'violet', /(😎 Buffer|💪 Exercise|blank|Apple Workout)/], ['PERSONAL', 'calendar.elam_personal', 'peach', /(😎 Buffer|💪 Exercise|blank|Apple Workout)/]],
  katie: [['KATIE', 'calendar.katie_personal', 'sunflower', null]],
  dax: 'calendar.cramer_tiny_cabins_turnover', // friendly name "Dax's schedule"; old card showed the next event only
  planner: [
    ['916', 'calendar.elam_noor_916', 'violet', /^(?:\s*|✅ 📧 Morning Catch Up)$|🎫 Ticket Review/],
    ['ELAM', 'calendar.elam_personal', 'peach', /💪 Exercise|Apple Workout/],
    ['KATIE', 'calendar.katie_personal', 'sunflower', null],
    ['FRIENDS', 'calendar.poly_calendar', 'ice', null],
  ],
  pages: ['KITCHEN'],
};

// ===================== CABIN: MASTER SYSTEMS STATUS (display only, landscape desktop) =====================
// Tile spec: { l: label, id, map: {state: text}, bad: [states shown red], warn: [states shown gold] }.
// Anything unavailable/unknown shows rust (NO SIGNAL). Meter spec: [label, entity, unit, min, max, kind, opts].
const OPEN = { on: 'OPEN', off: 'CLOSED' }, DET = { on: 'DETECTED', off: 'CLEAR' }, LINK = { on: 'ONLINE', off: 'OFFLINE' };
export const STATUS = {
  groups: [
    { key: 'WATER', tone: 'sky', tiles: [
      { l: 'MAIN SHUTOFF VALVE', id: 'switch.log_cabin_emergency_water_shutoff', map: { on: 'OPEN', off: 'CLOSED' }, bad: ['off'] }, // ASSUMPTION: switch on = valve open
      { l: 'LEAK • LOG BATH', id: 'binary_sensor.water_leak_sensor_log_cabin_bathroom_water_leak_detected', map: DET, bad: ['on'] },
      { l: 'LEAK • LOG KITCHEN', id: 'binary_sensor.water_leak_sensor_log_cabin_kitchen_water_leak_detected', map: DET, bad: ['on'] },
      { l: 'LEAK • AT VALVE', id: 'binary_sensor.log_cabin_emergency_water_shutoff_water_leak_detected', map: DET, bad: ['on'] },
      { l: 'VALVE JAMMED', id: 'binary_sensor.log_cabin_emergency_water_shutoff_valve_jammed', map: { on: 'JAMMED', off: 'NO' }, bad: ['on'] },
      { l: 'VALVE BACKUP BATTERY', id: 'binary_sensor.log_cabin_emergency_water_shutoff_back_up_battery_disconnected', map: { on: 'DISCONNECTED', off: 'CONNECTED' }, warn: ['on'] },
      { l: 'WATER MAIN HEAT TAPE', id: 'switch.outdoor_plug_1', map: { on: 'ON', off: 'OFF' }, warn: ['off'] },
      { l: 'WATER MAIN MOISTURE', id: 'binary_sensor.water_main_temp_sensor_moisture_alarm', map: DET, bad: ['on'] },
    ] },
    { key: 'SEPTIC', tone: 'peach', tiles: [
      { l: 'SEPTIC MONITOR', id: 'sensor.septic_monitor_node_status', map: { alive: 'ONLINE', dead: 'OFFLINE', asleep: 'ASLEEP' }, bad: ['dead'] },
      { l: 'PUMP RUNS TODAY', id: 'counter.septic_daily_run_counter', raw: true },
    ] },
    { key: 'SAFETY', tone: 'red', tiles: [
      { l: 'SMOKE • LOG CABIN', id: 'binary_sensor.log_cabin_smoke_co_sensor_smoke_detected', map: DET, bad: ['on'] },
      { l: 'CO • LOG CABIN', id: 'binary_sensor.log_cabin_smoke_co_sensor_carbon_monoxide_detected', map: DET, bad: ['on'] },
      { l: 'CRAWLSPACE MOISTURE', id: 'binary_sensor.crawlspace_temp_sensor_moisture_alarm', map: DET, bad: ['on'] },
    ] },
    { key: 'ACCESS', tone: 'violet', tiles: [
      { l: 'LOG CABIN LOCK', id: 'lock.yale_assure_lock_log_cabin', map: { locked: 'LOCKED', unlocked: 'UNLOCKED', jammed: 'JAMMED' }, warn: ['unlocked'], bad: ['jammed'] },
      { l: 'BUNK HOUSE LOCK', id: 'lock.bunk_house_yale_assure_lock_bunkhouse', map: { locked: 'LOCKED', unlocked: 'UNLOCKED', jammed: 'JAMMED' }, warn: ['unlocked'], bad: ['jammed'] },
      { l: 'BUNK HOUSE DOOR', id: 'binary_sensor.bunk_house_front_door_sensor', map: OPEN, warn: ['on'] },
      { l: 'BUNK COUCH WINDOW', id: 'binary_sensor.bunkhouse_couch_window_sensor_intrusion', map: OPEN, warn: ['on'] }, // ASSUMPTION: intrusion on = open
      { l: 'BUNK LOCK BATTERY', id: 'binary_sensor.bunk_house_yale_assure_lock_bunkhouse_replace_battery_soon', map: { on: 'REPLACE SOON', off: 'OK' }, warn: ['on'] },
    ] },
    { key: 'NETWORK', tone: 'ice', tiles: [
      { l: 'INTERNET (WAN)', id: 'binary_sensor.broadcom_adsl_router_wan_status', map: LINK, bad: ['off'] },
      { l: 'REMOTE ACCESS', id: 'binary_sensor.remote_ui', map: LINK, bad: ['off'] },
      { l: 'ZIGBEE COORDINATOR', id: 'binary_sensor.slzb_mrw10_internet', map: LINK, bad: ['off'] },
    ] },
  ],
  // THERMAL meters: freeze-critical spaces first. warnLo = caution (yellow) below, lo = alert (red) below, hi = alert above.
  // Thresholds match automation "Cabin Freeze Monitor". Bunk House has no plumbing and is heat-off when vacant: no low colors.
  thermal: [
    ['WATER MAIN', 'sensor.water_main_temp_sensor_air_temperature', { warnLo: 40, lo: 35, sub: 'OOD HOUSE' }],
    ['CRAWLSPACE', 'sensor.crawlspace_temp_sensor_air_temperature', { warnLo: 40, lo: 35, sub: 'LOG CABIN' }],
    ['LOG MAIN', 'climate.log_cabin_main_thermostat', { warnLo: 50, lo: 45, hi: 85 }],
    ['LOG FIREPLACE', 'climate.log_cabin_fireplace_thermostat', { warnLo: 50, lo: 45, hi: 85 }],
    ['BUNK MAIN', 'climate.bunk_main_thermostat', { hi: 85 }],
    ['BUNK BATH', 'climate.bunk_bath_thermostat_thermostat', { hi: 85 }],
  ],
  humidity: [
    ['LOG CABIN', 'sensor.shelly_humidity_and_temp_sensor_log_cabin_humidity', { hi: 70 }],
    ['BUNK HOUSE', 'sensor.bunk_main_thermostat_humidity', { hi: 70 }],
  ],
  co2: 'sensor.apollo_air_1_7bc400_co2',
  solar: { now: 'sensor.envoy_122117017195_current_power_production', today: 'sensor.envoy_122117017195_today_s_energy_production' },
  // OCCUPANCY per structure: rental calendar (on = an event is active now), activity clock, presence sensor
  units: [
    ['LOG CABIN', 'calendar.log_cabin_rental_calendar', 'sensor.hours_since_log_cabin_activity', 'binary_sensor.log_cabin_presence_sensor_log_cabin_presence_sensor_1'],
    ['BUNK HOUSE', 'calendar.bunk_house_calendar', 'sensor.hours_since_bunk_house_activity', 'binary_sensor.bunk_presence_sensor_presence_sensor_1'],
  ],
};
// DETAIL PAGES: one per side-lamp subsystem. Each is a list of panels of tiles. Extra tile keys:
//   unit (numeric reading + unit), lowWarn/lowBad/highWarn/highBad (numeric thresholds),
//   ago: 'state' (state is a timestamp) | 'changed' (time since last change), kind: 'climate'.
const NODE = { alive: 'ALIVE', asleep: 'ASLEEP', dead: 'DEAD', awake: 'AWAKE' };
const node = (l, id) => ({ l, id, map: NODE, bad: ['dead'] });
const batt = (l, id) => ({ l, id, unit: '%', lowWarn: 30, lowBad: 15 });
const flag = (l, id, on, off = 'OK', tone = 'bad') => ({ l, id, map: { on, off }, [tone]: ['on'] });
const seen = (l, id) => ({ l, id, ago: 'changed', map: DET });
// THERMAL page humidity row: every humidity sensor, display only (alerts still come from STATUS.humidity)
STATUS.humidityAll = [
  ['LOG CABIN', 'sensor.shelly_humidity_and_temp_sensor_log_cabin_humidity'],
  ['LOG MAIN STAT', 'sensor.log_cabin_main_thermostat_humidity'],
  ['APOLLO AIR', 'sensor.apollo_air_1_7bc400_sen55_humidity'],
  ['BUNK MAIN', 'sensor.bunk_main_thermostat_humidity'],
  ['BUNK BATH', 'sensor.bunk_bath_thermostat_current_humidity'],
  ['CRAWLSPACE', 'sensor.crawlspace_temp_sensor_humidity'],
  ['WATER MAIN', 'sensor.water_main_temp_sensor_humidity'],
];
STATUS.detail = {
  WATER: [
    { t: 'MAIN SHUTOFF VALVE • LOG CABIN BATH', tone: 'sky', cols: 3, tiles: [
      { l: 'VALVE (SWITCH)', id: 'switch.log_cabin_emergency_water_shutoff', map: { on: 'OPEN', off: 'CLOSED' }, bad: ['off'] },
      flag('VALVE ON / OPEN SENSOR', 'binary_sensor.log_cabin_emergency_water_shutoff_on_open', 'ON', 'OFF', 'none'),
      flag('VALVE JAMMED', 'binary_sensor.log_cabin_emergency_water_shutoff_valve_jammed', 'JAMMED', 'NO'),
      flag('AC MAINS', 'binary_sensor.log_cabin_emergency_water_shutoff_ac_mains_disconnected', 'DISCONNECTED', 'CONNECTED'),
      flag('BACKUP BATTERY', 'binary_sensor.log_cabin_emergency_water_shutoff_back_up_battery_disconnected', 'DISCONNECTED', 'CONNECTED', 'warn'),
      flag('BACKUP BATTERY LOW', 'binary_sensor.log_cabin_emergency_water_shutoff_back_up_battery_is_low', 'LOW', 'OK', 'warn'),
      flag('VALVE OVERHEAT', 'binary_sensor.log_cabin_emergency_water_shutoff_overheat_detected', 'DETECTED', 'NO'),
      flag('VALVE UNDERHEAT', 'binary_sensor.log_cabin_emergency_water_shutoff_underheat_detected', 'DETECTED', 'NO'),
      { l: 'AIR TEMP AT VALVE', id: 'sensor.log_cabin_emergency_water_shutoff_air_temperature', unit: '°F', lowBad: 40 },
      node('VALVE NODE', 'sensor.log_cabin_emergency_water_shutoff_node_status'),
    ] },
    { t: 'LEAK DETECTION', tone: 'sky', cols: 3, tiles: [
      { l: 'LEAK • LOG BATH', id: 'binary_sensor.water_leak_sensor_log_cabin_bathroom_water_leak_detected', map: DET, bad: ['on'] },
      { l: 'LEAK • LOG KITCHEN', id: 'binary_sensor.water_leak_sensor_log_cabin_kitchen_water_leak_detected', map: DET, bad: ['on'] },
      { l: 'LEAK • AT VALVE', id: 'binary_sensor.log_cabin_emergency_water_shutoff_water_leak_detected', map: DET, bad: ['on'] },
      batt('BATH SENSOR BATTERY', 'sensor.water_leak_sensor_log_cabin_bathroom_battery_level'),
      batt('KITCHEN SENSOR BATTERY', 'sensor.water_leak_sensor_log_cabin_kitchen_battery_level'),
      node('BATH SENSOR NODE', 'sensor.water_leak_sensor_log_cabin_bathroom_node_status'),
      node('KITCHEN SENSOR NODE', 'sensor.water_leak_sensor_log_cabin_kitchen_node_status'),
    ] },
    { t: 'WATER MAIN • OOD HOUSE', tone: 'sky', cols: 3, tiles: [
      { l: 'AIR TEMP', id: 'sensor.water_main_temp_sensor_air_temperature', unit: '°F', lowBad: 35 },
      { l: 'HUMIDITY', id: 'sensor.water_main_temp_sensor_humidity', unit: '%' },
      { l: 'MOISTURE', id: 'binary_sensor.water_main_temp_sensor_moisture_alarm', map: DET, bad: ['on'] },
      flag('UNDERHEAT', 'binary_sensor.water_main_temp_sensor_underheat_detected', 'DETECTED', 'NO'),
      flag('OVERHEAT', 'binary_sensor.water_main_temp_sensor_overheat_detected', 'DETECTED', 'NO'),
      { l: 'HEAT TAPE', id: 'switch.outdoor_plug_1', map: { on: 'ON', off: 'OFF' }, warn: ['off'] },
      node('HEAT TAPE OUTLET NODE', 'sensor.outdoor_plug_1_node_status'),
      batt('TEMP SENSOR BATTERY', 'sensor.water_main_temp_sensor_battery_level'),
      node('TEMP SENSOR NODE', 'sensor.water_main_temp_sensor_node_status'),
    ] },
  ],
  SEPTIC: [
    { t: 'SEPTIC MONITOR', tone: 'peach', cols: 3, tiles: [
      { l: 'MONITOR NODE', id: 'sensor.septic_monitor_node_status', map: NODE, bad: ['dead'] },
      { l: 'PUMP RUNS TODAY', id: 'counter.septic_daily_run_counter', raw: true },
      { l: 'LAST PING', id: 'button.septic_monitor_ping', ago: 'state' },
      { l: 'CHANNEL 1', id: 'switch.septic_monitor', map: { on: 'ON', off: 'OFF' } },
      { l: 'CHANNEL 3', id: 'switch.septic_monitor_3', map: { on: 'ON', off: 'OFF' } },
      { l: 'CHANNEL 4', id: 'switch.septic_monitor_4', map: { on: 'ON', off: 'OFF' } },
      { l: 'CHANNEL 5', id: 'switch.septic_monitor_5', map: { on: 'ON', off: 'OFF' } },
      { l: 'FIRMWARE', id: 'update.septic_monitor_firmware', map: { on: 'UPDATE AVAILABLE', off: 'CURRENT' }, warn: ['on'] },
    ] },
    { t: 'SCENE EVENTS • LAST FIRED', tone: 'peach', cols: 4, tiles: [
      { l: 'SCENE 001', id: 'event.septic_monitor_scene_001', ago: 'state' },
      { l: 'SCENE 002', id: 'event.septic_monitor_scene_002', ago: 'state' },
      { l: 'SCENE 003', id: 'event.septic_monitor_scene_003', ago: 'state' },
      { l: 'SCENE 004', id: 'event.septic_monitor_scene_004', ago: 'state' },
    ] },
    { t: 'SEPTIC AUTOMATIONS', tone: 'peach', cols: 3, tiles: [
      { l: 'RUN COUNTER', id: 'automation.septic_pump_run_counter', map: { on: 'ENABLED', off: 'DISABLED' }, warn: ['off'] },
      { l: 'DAILY RESET', id: 'automation.septic_pump_run_reset', map: { on: 'ENABLED', off: 'DISABLED' }, warn: ['off'] },
      { l: 'POWER OFFLINE ALERT', id: 'automation.septic_system_power_offline_alert', map: { on: 'ENABLED', off: 'DISABLED' }, warn: ['off'] },
    ] },
  ],
  THERMAL: [
    { meters: true },
    { thermo: ['climate.log_cabin_main_thermostat', 'climate.log_cabin_fireplace_thermostat', 'climate.bunk_main_thermostat', 'climate.bunk_bath_thermostat_thermostat'], labels: ['LOG CABIN MAIN', 'LOG CABIN FIREPLACE', 'BUNK HOUSE MAIN', 'BUNK HOUSE BATH'] },
    { t: 'CRAWLSPACE • LOG CABIN', tone: 'tan', cols: 6, tiles: [
      { l: 'AIR TEMP', id: 'sensor.crawlspace_temp_sensor_air_temperature', unit: '°F', lowBad: 40 },
      { l: 'HUMIDITY', id: 'sensor.crawlspace_temp_sensor_humidity', unit: '%' },
      flag('UNDERHEAT', 'binary_sensor.crawlspace_temp_sensor_underheat_detected', 'DETECTED', 'NO'),
      batt('SENSOR BATTERY', 'sensor.crawlspace_temp_sensor_battery_level'),
      node('SENSOR NODE', 'sensor.crawlspace_temp_sensor_node_status'),
      batt('FIREPLACE STAT BATTERY', 'sensor.log_cabin_fireplace_thermostat_battery_level'),
    ] },
  ],
  SAFETY: [
    { t: 'SMOKE / CO • LOG CABIN', tone: 'red', cols: 3, tiles: [
      { l: 'SMOKE', id: 'binary_sensor.log_cabin_smoke_co_sensor_smoke_detected', map: DET, bad: ['on'] },
      { l: 'CARBON MONOXIDE', id: 'binary_sensor.log_cabin_smoke_co_sensor_carbon_monoxide_detected', map: DET, bad: ['on'] },
      flag('TAMPER', 'binary_sensor.log_cabin_smoke_co_sensor_tampering_product_cover_removed', 'COVER REMOVED', 'OK', 'warn'),
      flag('DEVICE FAULT', 'binary_sensor.log_cabin_smoke_co_sensor_system_software_failure_with_failure_code', 'FAULT', 'OK', 'warn'),
      batt('BATTERY', 'sensor.log_cabin_smoke_co_sensor_battery_level'),
      node('NODE', 'sensor.log_cabin_smoke_co_sensor_node_status'),
    ] },
    { t: 'MOISTURE ALARMS', tone: 'red', cols: 2, tiles: [
      { l: 'CRAWLSPACE', id: 'binary_sensor.crawlspace_temp_sensor_moisture_alarm', map: DET, bad: ['on'] },
      { l: 'WATER MAIN', id: 'binary_sensor.water_main_temp_sensor_moisture_alarm', map: DET, bad: ['on'] },
    ] },
    { t: 'SECURITY SYSTEM', tone: 'red', cols: 2, tiles: [
      { l: 'WYZE HOME MONITORING', id: 'alarm_control_panel.wyze_home_monitoring_system', map: { disarmed: 'DISARMED', armed_home: 'ARMED HOME', armed_away: 'ARMED AWAY', triggered: 'TRIGGERED' }, bad: ['triggered'] },
    ] },
  ],
  ACCESS: [
    { t: 'LOG CABIN LOCK', tone: 'violet', cols: 3, tiles: [
      { l: 'LOCK', id: 'lock.yale_assure_lock_log_cabin', map: { locked: 'LOCKED', unlocked: 'UNLOCKED', jammed: 'JAMMED' }, warn: ['unlocked'], bad: ['jammed'] },
      flag('JAMMED', 'binary_sensor.yale_assure_lock_log_cabin_lock_jammed', 'JAMMED', 'NO'),
      flag('KEYPAD', 'binary_sensor.yale_assure_lock_log_cabin_keypad_temporary_disabled', 'DISABLED', 'ACTIVE', 'warn'),
      batt('BATTERY', 'sensor.yale_assure_lock_log_cabin_battery_level'),
      flag('REPLACE BATTERY', 'binary_sensor.yale_assure_lock_log_cabin_replace_battery_now', 'NOW', 'NO'),
      node('NODE', 'sensor.yale_assure_lock_log_cabin_node_status'),
    ] },
    { t: 'BUNK HOUSE LOCK', tone: 'violet', cols: 3, tiles: [
      { l: 'LOCK', id: 'lock.bunk_house_yale_assure_lock_bunkhouse', map: { locked: 'LOCKED', unlocked: 'UNLOCKED', jammed: 'JAMMED' }, warn: ['unlocked'], bad: ['jammed'] },
      flag('JAMMED', 'binary_sensor.bunk_house_yale_assure_lock_bunkhouse_lock_jammed', 'JAMMED', 'NO'),
      flag('KEYPAD', 'binary_sensor.bunk_house_yale_assure_lock_bunkhouse_keypad_temporary_disabled', 'DISABLED', 'ACTIVE', 'warn'),
      batt('BATTERY', 'sensor.bunk_house_yale_assure_lock_bunkhouse_battery_level'),
      flag('REPLACE BATTERY', 'binary_sensor.bunk_house_yale_assure_lock_bunkhouse_replace_battery_now', 'NOW', 'NO'),
      node('NODE', 'sensor.bunk_house_yale_assure_lock_bunkhouse_node_status'),
    ] },
    { t: 'BUNK HOUSE OPENINGS', tone: 'violet', cols: 3, tiles: [
      { l: 'FRONT DOOR', id: 'binary_sensor.bunk_house_front_door_sensor', map: OPEN, warn: ['on'], ago: 'changed' },
      batt('DOOR SENSOR BATTERY', 'sensor.bunk_house_front_door_battery_level'),
      flag('DOOR SENSOR TAMPER', 'binary_sensor.bunk_house_front_door_tampering_product_cover_removed', 'COVER REMOVED', 'OK', 'warn'),
      { l: 'COUCH WINDOW', id: 'binary_sensor.bunkhouse_couch_window_sensor_intrusion', map: OPEN, warn: ['on'], ago: 'changed' },
      batt('WINDOW SENSOR BATTERY', 'sensor.bunkhouse_couch_window_sensor_battery_level'),
      flag('WINDOW SENSOR TAMPER', 'binary_sensor.bunkhouse_couch_window_sensor_tampering_product_cover_removed', 'COVER REMOVED', 'OK', 'warn'),
    ] },
  ],
  NETWORK: [
    { t: 'CONNECTIVITY', tone: 'ice', cols: 3, tiles: [
      { l: 'INTERNET (WAN)', id: 'binary_sensor.broadcom_adsl_router_wan_status', map: LINK, bad: ['off'] },
      { l: 'REMOTE ACCESS (NABU CASA)', id: 'binary_sensor.remote_ui', map: LINK, bad: ['off'] },
      { l: 'ZIGBEE COORD • INTERNET', id: 'binary_sensor.slzb_mrw10_internet', map: LINK, bad: ['off'] },
      { l: 'ZIGBEE COORD • ETHERNET', id: 'binary_sensor.slzb_mrw10_ethernet', map: LINK, bad: ['off'] },
      { l: 'APOLLO AIR SENSOR', id: 'binary_sensor.apollo_air_1_7bc400_online', map: LINK, bad: ['off'] },
      batt('CABIN CONTROL IPAD', 'sensor.cabin_control_ipad_battery_level'),
    ] },
    { t: 'Z-WAVE NODES', tone: 'ice', cols: 4, tiles: [
      node('WATER SHUTOFF', 'sensor.log_cabin_emergency_water_shutoff_node_status'),
      node('SEPTIC MONITOR', 'sensor.septic_monitor_node_status'),
      node('SMOKE / CO', 'sensor.log_cabin_smoke_co_sensor_node_status'),
      node('BUNK LOCK', 'sensor.bunk_house_yale_assure_lock_bunkhouse_node_status'),
      node('LOG CABIN LOCK', 'sensor.yale_assure_lock_log_cabin_node_status'),
      node('BUNK DOOR SENSOR', 'sensor.bunk_house_front_door_node_status'),
      node('COUCH WINDOW', 'sensor.bunkhouse_couch_window_sensor_node_status'),
      node('CRAWLSPACE SENSOR', 'sensor.crawlspace_temp_sensor_node_status'),
      node('WATER MAIN SENSOR', 'sensor.water_main_temp_sensor_node_status'),
      node('LEAK • BATH', 'sensor.water_leak_sensor_log_cabin_bathroom_node_status'),
      node('LEAK • KITCHEN', 'sensor.water_leak_sensor_log_cabin_kitchen_node_status'),
      node('FIREPLACE STAT', 'sensor.log_cabin_fireplace_thermostat_node_status'),
      node('LOG SCENE CTRL', 'sensor.log_cabin_scene_controler_node_status'),
      node('BUNK SCENE CTRL', 'sensor.bunk_house_scene_controller_node_status'),
      node('HEAT TAPE OUTLET', 'sensor.outdoor_plug_1_node_status'),
      node('LOG OUTDOOR OUTLET', 'sensor.log_cabin_outdoor_outlet_log_cabin_node_status'),
      node('BUNK OUTDOOR OUTLET', 'sensor.bunk_house_outdoor_outlet_bunkhouse_node_status'),
      node('ZOOZ OUTLET 2', 'sensor.zooz_outdoor_outlets_node_status'),
    ] },
  ],
};
// CAMERAS page: [label, camera, wide (spans the full row), detection sensors [label, binary_sensor]]
STATUS.cameras = [
  ['LOG CABIN ENTRY', 'camera.log_cabin_entry_fluent', false, [['PERSON', 'binary_sensor.log_cabin_entry_person'], ['VEHICLE', 'binary_sensor.log_cabin_entry_vehicle'], ['ANIMAL', 'binary_sensor.log_cabin_entry_animal'], ['MOTION', 'binary_sensor.log_cabin_entry_motion']]],
  ['LOG CABIN FRONT DOORBELL', 'camera.log_cabin_front_doorbell_fluent', false, [['VISITOR', 'binary_sensor.log_cabin_front_doorbell_visitor'], ['PERSON', 'binary_sensor.log_cabin_front_doorbell_person'], ['PACKAGE', 'binary_sensor.log_cabin_front_doorbell_package'], ['VEHICLE', 'binary_sensor.log_cabin_front_doorbell_vehicle'], ['MOTION', 'binary_sensor.log_cabin_front_doorbell_motion']]],
  ['BUNK HOUSE PANO', 'camera.bunk_house_pano_fluent', true, [['PERSON', 'binary_sensor.bunk_house_pano_person'], ['VEHICLE', 'binary_sensor.bunk_house_pano_vehicle'], ['ANIMAL', 'binary_sensor.bunk_house_pano_animal'], ['MOTION', 'binary_sensor.bunk_house_pano_motion']]],
];
// External public webcams shown on the CAMERAS page: [label, embed URL, source page]. Not Home Assistant entities.
STATUS.webcams = [
  ['TOFTE WAVECAM • BLUEFIN BAY', 'https://video.nest.com/embedded/live/tDBlRMs7nK?autoplay=1', 'https://www.bluefinbay.com/wavecam'],
];
// ACCESS page layout: entry hardware for the Bunk House (the tiles in STATUS.detail.ACCESS still drive alerts)
STATUS.access = {
  locks: [
    { l: 'LOG CABIN LOCK', id: 'lock.yale_assure_lock_log_cabin', battery: 'sensor.yale_assure_lock_log_cabin_battery_level',
      chips: [['JAMMED', 'binary_sensor.yale_assure_lock_log_cabin_lock_jammed', { on: 'JAMMED', off: 'NO' }, 'bad'], ['KEYPAD', 'binary_sensor.yale_assure_lock_log_cabin_keypad_temporary_disabled', { on: 'DISABLED', off: 'ACTIVE' }, 'warn'], ['REPLACE BATT', 'binary_sensor.yale_assure_lock_log_cabin_replace_battery_now', { on: 'NOW', off: 'NO' }, 'bad'], ['NODE', 'sensor.yale_assure_lock_log_cabin_node_status', { alive: 'ALIVE', asleep: 'ASLEEP', dead: 'DEAD' }, 'dead']] },
    { l: 'BUNK HOUSE LOCK', id: 'lock.bunk_house_yale_assure_lock_bunkhouse', battery: 'sensor.bunk_house_yale_assure_lock_bunkhouse_battery_level',
      chips: [['JAMMED', 'binary_sensor.bunk_house_yale_assure_lock_bunkhouse_lock_jammed', { on: 'JAMMED', off: 'NO' }, 'bad'], ['KEYPAD', 'binary_sensor.bunk_house_yale_assure_lock_bunkhouse_keypad_temporary_disabled', { on: 'DISABLED', off: 'ACTIVE' }, 'warn'], ['REPLACE BATT', 'binary_sensor.bunk_house_yale_assure_lock_bunkhouse_replace_battery_now', { on: 'NOW', off: 'NO' }, 'bad'], ['NODE', 'sensor.bunk_house_yale_assure_lock_bunkhouse_node_status', { alive: 'ALIVE', asleep: 'ASLEEP', dead: 'DEAD' }, 'dead']] },
  ],
  openings: [
    { l: 'BUNK HOUSE FRONT DOOR', id: 'binary_sensor.bunk_house_front_door_sensor', battery: 'sensor.bunk_house_front_door_battery_level', tamper: 'binary_sensor.bunk_house_front_door_tampering_product_cover_removed' },
    { l: 'BUNK COUCH WINDOW', id: 'binary_sensor.bunkhouse_couch_window_sensor_intrusion', battery: 'sensor.bunkhouse_couch_window_sensor_battery_level', tamper: 'binary_sensor.bunkhouse_couch_window_sensor_tampering_product_cover_removed' },
  ],
};
// NETWORK page layout: connectivity cards + Z-Wave nodes grouped by building (detail tiles still drive alerts)
STATUS.network = {
  links: [
    { l: 'INTERNET • WAN', id: 'binary_sensor.broadcom_adsl_router_wan_status' },
    { l: 'REMOTE ACCESS • NABU CASA', id: 'binary_sensor.remote_ui' },
    { l: 'ZIGBEE COORDINATOR', id: 'binary_sensor.slzb_mrw10_internet', sub: [['ETHERNET', 'binary_sensor.slzb_mrw10_ethernet']] },
    { l: 'APOLLO AIR SENSOR', id: 'binary_sensor.apollo_air_1_7bc400_online' },
  ],
  ipad: { l: 'CABIN CONTROL IPAD', battery: 'sensor.cabin_control_ipad_battery_level' },
  zwave: [
    ['LOG CABIN', [['WATER SHUTOFF', 'sensor.log_cabin_emergency_water_shutoff_node_status', 'mains'], ['LOG CABIN LOCK', 'sensor.yale_assure_lock_log_cabin_node_status', 'lock'], ['SMOKE / CO', 'sensor.log_cabin_smoke_co_sensor_node_status', 'battery'], ['FIREPLACE STAT', 'sensor.log_cabin_fireplace_thermostat_node_status', 'battery'], ['CRAWLSPACE SENSOR', 'sensor.crawlspace_temp_sensor_node_status', 'battery'], ['LEAK • BATH', 'sensor.water_leak_sensor_log_cabin_bathroom_node_status', 'battery'], ['LEAK • KITCHEN', 'sensor.water_leak_sensor_log_cabin_kitchen_node_status', 'battery'], ['SCENE CONTROLLER', 'sensor.log_cabin_scene_controler_node_status', 'mains'], ['OUTDOOR OUTLET', 'sensor.log_cabin_outdoor_outlet_log_cabin_node_status', 'mains']]],
    ['BUNK HOUSE', [['BUNK LOCK', 'sensor.bunk_house_yale_assure_lock_bunkhouse_node_status', 'lock'], ['DOOR SENSOR', 'sensor.bunk_house_front_door_node_status', 'battery'], ['COUCH WINDOW', 'sensor.bunkhouse_couch_window_sensor_node_status', 'battery'], ['SCENE CONTROLLER', 'sensor.bunk_house_scene_controller_node_status', 'mains'], ['OUTDOOR OUTLET', 'sensor.bunk_house_outdoor_outlet_bunkhouse_node_status', 'mains']]],
    ['SITE / UTILITY', [['SEPTIC MONITOR', 'sensor.septic_monitor_node_status', 'mains'], ['WATER MAIN SENSOR', 'sensor.water_main_temp_sensor_node_status', 'battery'], ['HEAT TAPE OUTLET', 'sensor.outdoor_plug_1_node_status', 'mains'], ['ZOOZ OUTLET 2', 'sensor.zooz_outdoor_outlets_node_status', 'mains']]],
  ],
};
// PHONE SUBSYSTEM PAGES (room: mobile): purpose-built glance views. Raw tiles stay under DIAGNOSTICS (STATUS.detail).
// Every id here also appears in STATUS.detail, so alerts and subscriptions are unchanged.
STATUS.phone = {
  WATER: {
    valve: { id: 'switch.log_cabin_emergency_water_shutoff', jammed: 'binary_sensor.log_cabin_emergency_water_shutoff_valve_jammed', mains: 'binary_sensor.log_cabin_emergency_water_shutoff_ac_mains_disconnected', backup: 'binary_sensor.log_cabin_emergency_water_shutoff_back_up_battery_disconnected', node: 'sensor.log_cabin_emergency_water_shutoff_node_status' },
    leaks: [
      ['LOG BATH', 'binary_sensor.water_leak_sensor_log_cabin_bathroom_water_leak_detected', 'sensor.water_leak_sensor_log_cabin_bathroom_battery_level'],
      ['LOG KITCHEN', 'binary_sensor.water_leak_sensor_log_cabin_kitchen_water_leak_detected', 'sensor.water_leak_sensor_log_cabin_kitchen_battery_level'],
      ['AT VALVE', 'binary_sensor.log_cabin_emergency_water_shutoff_water_leak_detected', null],
    ],
    main: { temp: 'sensor.water_main_temp_sensor_air_temperature', tape: 'switch.outdoor_plug_1', moisture: 'binary_sensor.water_main_temp_sensor_moisture_alarm', battery: 'sensor.water_main_temp_sensor_battery_level' },
  },
  SEPTIC: {
    pump: 'switch.septic_monitor', runs: 'counter.septic_daily_run_counter', node: 'sensor.septic_monitor_node_status', ping: 'button.septic_monitor_ping',
    // High-level alarm input is not wired yet (relay pending), so the console says so instead of showing a false "OK".
    alarmNote: 'HIGH-LEVEL ALARM IS NOT MONITORED YET • RELAY INSTALL PENDING',
  },
  SAFETY: {
    big: [['SMOKE', 'binary_sensor.log_cabin_smoke_co_sensor_smoke_detected'], ['CARBON MONOXIDE', 'binary_sensor.log_cabin_smoke_co_sensor_carbon_monoxide_detected']],
    moisture: [['CRAWLSPACE', 'binary_sensor.crawlspace_temp_sensor_moisture_alarm'], ['WATER MAIN', 'binary_sensor.water_main_temp_sensor_moisture_alarm']],
    battery: ['SMOKE / CO DETECTOR', 'sensor.log_cabin_smoke_co_sensor_battery_level'],
    alarm: 'alarm_control_panel.wyze_home_monitoring_system',
  },
  batteries: [
    ['LOG CABIN LOCK', 'sensor.yale_assure_lock_log_cabin_battery_level'], ['BUNK HOUSE LOCK', 'sensor.bunk_house_yale_assure_lock_bunkhouse_battery_level'],
    ['BUNK DOOR SENSOR', 'sensor.bunk_house_front_door_battery_level'], ['COUCH WINDOW SENSOR', 'sensor.bunkhouse_couch_window_sensor_battery_level'],
  ],
};

// PHONE CONTROLS (room: mobile). Every action that changes something physical needs a second tap within 4 s.
STATUS.controls = {
  lights: [['LOG CABIN ACCENT LIGHTS', 'light.log_cabin_ball_lights'], ['BUNK HOUSE LIGHTS', 'light.all_bunk_house_lights'], ['STRING LIGHTS', 'light.string_lights']],
  locks: [['LOG CABIN', 'lock.yale_assure_lock_log_cabin', 'sensor.yale_assure_lock_log_cabin_battery_level'], ['BUNK HOUSE', 'lock.bunk_house_yale_assure_lock_bunkhouse', 'sensor.bunk_house_yale_assure_lock_bunkhouse_battery_level']],
  climate: [['LOG CABIN MAIN', 'climate.log_cabin_main_thermostat'], ['LOG CABIN FIREPLACE', 'climate.log_cabin_fireplace_thermostat'], ['BUNK HOUSE MAIN', 'climate.bunk_main_thermostat'], ['BUNK HOUSE BATH', 'climate.bunk_bath_thermostat_thermostat']],
  // [label, switch, text when on, text when off, warning shown before turning off]
  switches: [
    ['MAIN WATER VALVE', 'switch.log_cabin_emergency_water_shutoff', 'OPEN', 'CLOSED', 'CLOSING CUTS WATER TO THE LOG CABIN'],
    ['WATER MAIN HEAT TAPE', 'switch.outdoor_plug_1', 'ON', 'OFF', 'THE WATER MAIN CAN FREEZE WITHOUT HEAT TAPE'],
  ],
};
export function statusIds(S) {
  return [...S.groups.flatMap((g) => g.tiles.map((t) => t.id)), ...Object.values(S.detail ?? {}).flat().flatMap((p) => (p.tiles ?? []).map((t) => t.id)), ...(S.cameras ?? []).flatMap(([, c, , d]) => [c, ...d.map((x) => x[1])]), ...(S.humidityAll ?? []).map((x) => x[1]), ...(S.controls ? [...(S.controls.lights ?? []).map((x) => x[1]), ...S.controls.locks.flatMap((x) => [x[1], x[2]]), ...S.controls.climate.map((x) => x[1]), ...S.controls.switches.map((x) => x[1])] : []), ...S.thermal.map((m) => m[1]), ...S.humidity.map((m) => m[1]), S.co2, ...Object.values(S.solar), ...S.units.flatMap((u) => u.slice(1))];
}
ROOMS.status = {
  key: 'status', title: 'TINY CABINS', kiosk: 'status',
  lights: null, lightMembers: [], lightScenes: [], media: [], commands: [],
  weather: { entity: 'weather.forecast_tiny_cabins', sun: 'sun.sun', hvacOutdoor: null },
  status: STATUS, pages: ['STATUS'],
};
ROOMS.mobile = { ...ROOMS.status, key: 'mobile', kiosk: 'mobile' };

export function roomIds(R) {
  return [
    R.lights, ...(R.lightMembers ?? []), ...R.lightScenes.map(([, id]) => id),
    ...(R.zones ?? []).flatMap(([, id, m]) => [id, ...m]),
    R.blinds?.group, ...(R.blinds?.members.map(([, id]) => id) ?? []),
    ...Object.values(R.quick ?? {}), ...Object.values(R.weather ?? {}), ...(R.findMy ?? []).map(([, id]) => id),
    R.fan, R.hvac, ...R.media.map((m) => m[2]),
    ...R.commands.flatMap((c) => [c.id, c.away, ...(c.targets ?? [])]),
    R.calendar?.focus, ...(R.calendar?.cals.map((c) => c[1]) ?? []),
    ...(R.vehicles ?? []).flatMap(vehicleIds),
    ...Object.values(R.modes ?? {}), R.aiTimeline,
    ...(R.status ? statusIds(R.status) : []),
    R.telemetry?.hvac, R.telemetry?.freezer, ...(R.telemetry?.cars ?? []).map(([, id]) => id),
  ].filter(Boolean);
}
export const ALL_IDS = [...new Set([...Object.values(SHARED).flat(), ...Object.values(ROOMS).flatMap(roomIds)])];

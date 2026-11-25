// Simulation backend: seeded from a live Retro House snapshot (2026-10-29 22:07 CDT).
// Mirrors HA service semantics closely enough to exercise every control offline.
import { batch } from '@preact/signals';
import { ent } from './ha.js';

const now = () => Date.now() / 1000;
const iso = () => new Date().toISOString();

import { ROOMS } from './rooms.js';
const LIGHT_MEMBERS = ROOMS.bedroom.lightMembers;
const VR_MEMBERS = ROOMS.office.lightMembers;
const BLIND_MEMBERS = ROOMS.bedroom.blinds.members.map(([, id]) => id);

const T = Date.parse('2026-10-30T03:07:00Z') / 1000; // 22:07 CDT 2026-10-29
const S = (state, attributes = {}) => ({ state, attributes, last_changed: T - 600, last_updated: T - 600 });

export const SEED = {
  'binary_sensor.retro_front_door_visitor': S('off', { friendly_name: 'Retro Front Door Visitor' }),
  'camera.retro_front_door_clear': S('idle', { friendly_name: 'Doorbell Video HD' }),
  'media_player.bedroom': S('playing', { friendly_name: 'Bedroom TV', media_title: 'Masterminds', supported_features: 450487, source: 'Netflix' }),
  'light.master_bed': S('on', { friendly_name: 'Primary Bed', brightness: 173, color_mode: 'color_temp', color_temp_kelvin: 4000, min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6535, supported_color_modes: ['color_temp', 'xy'], rgb_color: [255, 206, 166], hs_color: [26.8, 34.9], entity_id: LIGHT_MEMBERS }),
  'light.hue_color_lamp_1_5': S('off', { friendly_name: 'Primary - Gold Desk Lamp' }),
  'light.bookshelf': S('on', { friendly_name: 'Bookshelf', brightness: 119 }),
  'light.elam_desk_1': S('unavailable', { friendly_name: 'Elam Desk 1' }),
  'light.nightstand': S('on', { friendly_name: 'Nightstand', brightness: 119 }),
  'light.elam_desk_2': S('on', { friendly_name: 'Elam Desk 2', brightness: 119 }),
  'light.tv_lamp': S('unavailable', { friendly_name: 'TV Lamp' }),
  'cover.primary_bed_blinds': S('closed', { friendly_name: 'Blinds - Primary Bed', current_position: 0, supported_features: 15, entity_id: BLIND_MEMBERS }),
  'cover.blind_primary_bed_1': S('closed', { friendly_name: 'Blind - Primary Bed 1', current_position: 0 }),
  'cover.blind_primary_bed_2': S('closed', { friendly_name: 'Blind - Primary Bed 2', current_position: 0 }),
  'cover.blind_primary_bed_3': S('closed', { friendly_name: 'Blind - Primary Bed 3', current_position: 0 }),
  'fan.fan': S('off', { friendly_name: 'Bedroom Fan', supported_features: 48 }),
  'input_button.dax_stop_audio_ha': S('2025-09-12T04:48:38+00:00', { friendly_name: 'Dax Stop Audio (HA)' }),
  'input_button.dax_quiet_button_ha': S('2026-02-26T11:41:53+00:00', { friendly_name: 'Dax Quiet Button (HA)' }),
  'light.sonoff_10021a5310': S('unavailable', { friendly_name: 'Retro Primary Bed Switch Nightlight', supported_color_modes: ['onoff'] }),
  'input_button.goodnight_ha': S('2026-10-29T04:43:12+00:00', { friendly_name: 'Goodnight (HA)' }),
  'scene.master_bed_dimmed': S('2026-01-19T03:31:59+00:00', { friendly_name: 'Primary Bed Dimmed' }),
  'scene.master_bed_tokyo': S('2026-10-28T18:33:11+00:00', { friendly_name: 'Primary Bed Tokyo' }),
  'input_button.sexy_time_ha': S('2026-10-29T02:26:04+00:00', { friendly_name: 'Sexy Time (HA)' }),
  'scene.im_being_blinded': S('unknown', { friendly_name: 'Im Being Blinded', entity_id: ['cover.blind_primary_bed_1'] }),
  'binary_sensor.front_door_contact_input': S('off', { friendly_name: 'Front Door', device_class: 'door' }),
  'binary_sensor.kitchen_entry_contact_input': S('off', { friendly_name: 'Kitchen Door', device_class: 'door' }),
  'binary_sensor.garage_entry_contact_input': S('off', { friendly_name: 'Garage Entry Door', device_class: 'door' }),
  'binary_sensor.fire_room_entry_contact_input': S('off', { friendly_name: 'Fire Room Door', device_class: 'door' }),
  'cover.ratgdov25i_4bfba4_door': S('closed', { friendly_name: 'Garage Door', device_class: 'garage', current_position: 0, supported_features: 15 }),
  'binary_sensor.ratgdov25i_4bfba4_obstruction': S('off', { friendly_name: 'Garage Obstruction', device_class: 'problem' }),
  'switch.adaptive_lighting_sleep_mode_retro_house_adaptive_lighting': S('off', { friendly_name: 'Adaptive Lighting Sleep Mode' }),
  'automation.open_vr_room_blind_at_8am': S('on', { friendly_name: 'Open VR Room Blind at 8am', current: 0 }),
  'light.plant_wall_grow_light_thirdreality': S('on', { friendly_name: 'Plant Wall Grow Light' }),
  'switch.autowater_officewindow': S('off', { friendly_name: 'AutoWater OfficeWindow' }),
  'switch.on_off_module_36_6d_eb': S('off', { friendly_name: 'OutletLinc - Workdesk Lamp' }),
  'switch.sonoff_10017fff5e_1': S('on', { friendly_name: 'Bubble Clock' }),
  'input_button.find_tricorder': S('2026-11-10T21:56:24+00:00', { friendly_name: 'Find Tricorder' }),
  'media_player.bedroom_2': S('idle', { friendly_name: 'Bedroom', supported_features: 7796279, mass_player_type: 'player', volume_level: 0.3 }),
  'media_player.vr_room': S('idle', { friendly_name: 'VR Room', supported_features: 7796279, mass_player_type: 'player', volume_level: 0.4 }),
  'media_player.kitchen': S('playing', { friendly_name: 'Kitchen', supported_features: 7796279, mass_player_type: 'player', volume_level: 0.45, media_title: 'Midnight City', media_artist: 'M83', media_album_name: "Hurry Up, We're Dreaming", media_duration: 244, media_position: 61, media_position_updated_at: new Date().toISOString(), shuffle: false, repeat: 'off', app_id: 'music_assistant' }),
  'media_player.bathroom': S('idle', { friendly_name: 'Bathroom', supported_features: 7796279, mass_player_type: 'player', volume_level: 0.3 }),
  "media_player.dax_s_room": S('idle', { friendly_name: "Dax's Room", supported_features: 7796279, mass_player_type: 'player', volume_level: 0.3 }),
  'media_player.fire_room_bose': S('idle', { friendly_name: 'Fire Room Bose', supported_features: 8320575, mass_player_type: 'player', volume_level: 0.34 }),
  'media_player.retro_whole_house': S('idle', { friendly_name: 'Retro Whole House', supported_features: 7796279, mass_player_type: 'player', volume_level: 0.4 }),
  'media_player.fire_room': S('off', { friendly_name: 'Fire Room TV', supported_features: 448439 }),
  'scene.master_bed_bright': S('2026-06-08T02:10:52+00:00', { friendly_name: 'Primary Bed Bright' }),
  'scene.master_bed_read': S('unknown', { friendly_name: 'Primary Bed Read' }),
  'scene.master_bed_concentrate': S('unknown', { friendly_name: 'Primary Bed Concentrate' }),
  'scene.master_bed_energize': S('2023-12-21T01:36:21+00:00', { friendly_name: 'Primary Bed Energize' }),
  'scene.master_bed_relax': S('2026-06-08T01:57:49+00:00', { friendly_name: 'Primary Bed Relax' }),
  'scene.primary_bed_nightlight': S('2026-02-23T03:33:30+00:00', { friendly_name: 'Primary Bed Nightlight' }),
  // office (VR Room), snapshot 2026-10-30 00:15
  'light.vr_room': S('on', { friendly_name: 'VR Room', brightness: 5, color_mode: 'color_temp', color_temp_kelvin: 2000, min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6535, supported_color_modes: ['color_temp', 'xy'], rgb_color: [255, 137, 14], entity_id: VR_MEMBERS }),
  'light.vr_under_couch_2': S('on', { friendly_name: 'VR Under Couch 2', brightness: 5 }),
  'light.plant_wall': S('on', { friendly_name: 'Plant Wall', brightness: 5 }),
  'light.hue_color_lamp_1_4': S('unavailable', { friendly_name: 'Round Lamp 1 - Dining' }),
  'light.vr_strip': S('on', { friendly_name: 'VR Strip', brightness: 5 }),
  'light.vr_corner': S('unavailable', { friendly_name: 'VR Corner' }),
  'light.vr_under_couch_1': S('on', { friendly_name: 'VR Under Couch 1', brightness: 5 }),
  'light.hue_color_lamp_2': S('on', { friendly_name: 'Round Lamp 2 - Desk', brightness: 5 }),
  'cover.blind_vr_room_left': S('open', { friendly_name: 'Blind - VR Room Left', current_position: 100, supported_features: 15 }),
  'cover.blind_vr_room_right': S('open', { friendly_name: 'Blind - VR Room Right', current_position: 100, supported_features: 15 }),
  'cover.vr_room_large_blind': S('unavailable', { friendly_name: 'VR Room Large Blind', supported_features: 15 }),
  'scene.vr_room_bright': S('2026-10-29T23:04:17+00:00', { friendly_name: 'VR Room Bright' }),
  'scene.vr_room_relax': S('2023-04-17T00:33:10+00:00', { friendly_name: 'VR Room Relax' }),
  'scene.vr_room_dimmed': S('unknown', { friendly_name: 'VR Room Dimmed' }),
  'scene.vr_room_tokyo': S('2022-09-27T04:02:25+00:00', { friendly_name: 'VR Room Tokyo' }),
  'scene.vr_room_blue_planet': S('unknown', { friendly_name: 'VR Room Blue Planet' }),
  'scene.vr_room_color_burst': S('unknown', { friendly_name: 'VR Room Color burst' }),
  'scene.vr_room_ruby_romance': S('unknown', { friendly_name: 'VR Room Ruby romance' }),
  'scene.whole_house_lights_bright': S('2026-10-05T14:05:49+00:00', { friendly_name: 'All Hue Lights Bright' }),
  'scene.whole_house_lights_tokyo': S('2026-10-27T20:45:20+00:00', { friendly_name: 'All Hue Lights Tokyo' }),
  'binary_sensor.retroha_calendar_ipad_focus': S('off', { friendly_name: 'RetroHA Calendar iPad Focus' }),
  'calendar.elam_personal': S('off', { friendly_name: 'Elam personal' }),
  'calendar.elam_noor_916': S('off', { friendly_name: 'Elam noor - 916' }),
  // basement entry, snapshot 2026-10-30 01:00
  'light.entry': S('on', { friendly_name: 'Entry', brightness: 3, color_mode: 'color_temp', color_temp_kelvin: 2000, min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6535, supported_color_modes: ['color_temp', 'xy'], rgb_color: [255, 137, 14], entity_id: ROOMS.entry.lightMembers }),
  'light.chandelier_1': S('on', { friendly_name: 'Chandelier 1', brightness: 3 }),
  'light.chandelier_2': S('on', { friendly_name: 'Chandelier 2', brightness: 3 }),
  'light.chandelier_3': S('on', { friendly_name: 'Chandelier 3', brightness: 3 }),
  'light.chandelier_4': S('on', { friendly_name: 'Chandelier 4', brightness: 3 }),
  'light.chandelier_5': S('on', { friendly_name: 'Chandelier 5', brightness: 3 }),
  'light.hue_color_lamp_1_2': S('on', { friendly_name: 'Porch 1', brightness: 3 }),
  'light.hue_color_lamp_1_3': S('on', { friendly_name: 'Front Porch 2', brightness: 3 }),
  'light.all_lights': S('on', { friendly_name: 'All Lights', brightness: 133 }),
  'light.porch_lights': S('on', { friendly_name: 'Porch Lights', brightness: 3 }),
  'input_boolean.away_mode': S('off', { friendly_name: 'Away Mode' }),
  'automation.goodbye': S('on', { friendly_name: 'Keypad - Stairs - Button G - Goodbye', current: 0, last_triggered: null, mode: 'single' }),
  'binary_sensor.all_doors': S('off', { friendly_name: 'All Doors', device_class: 'door' }),
  'scene.entry_relax': S('2026-10-29T23:04:17+00:00', { friendly_name: 'Entry Relax' }),
  'scene.entry_glowing_grins': S('unknown', { friendly_name: 'Entry Glowing grins' }),
  'weather.nws_retrohouse': S('cloudy', { friendly_name: 'NWS RetroHouse', temperature: 52, temperature_unit: '°F', humidity: 82, pressure: 30.28, wind_bearing: 140, wind_speed: 9.22, wind_speed_unit: 'mph', visibility: 10, visibility_unit: 'mi', precipitation_unit: 'in', supported_features: 6 }),
  'sun.sun': S('above_horizon', { friendly_name: 'Sun', elevation: 18.4, azimuth: 214.6, next_rising: '2026-10-30T12:48:40+00:00', next_setting: '2026-10-30T23:02:49+00:00' }),
  'sensor.retro_house_outdoor_temperature': S('45.0', { friendly_name: 'Retro House HVAC Outdoor Temperature', unit_of_measurement: '°F' }),
  'sensor.retro_freezer_thermostat_temperature_probe': S('0.95', { unit_of_measurement: '°F' }),
  'climate.retro_house_upstairs': S('fan_only', { friendly_name: 'Retro House HVAC Upstairs', hvac_modes: ['off', 'fan_only', 'cool', 'heat', 'heat_cool'], min_temp: 45, max_temp: 95, preset_modes: ['away', 'home', 'manual', 'sleep', 'wake', 'vacation', 'resume'], preset_mode: 'home', current_temperature: 70, current_humidity: 48, fan_modes: ['low', 'med', 'high', 'auto'], fan_mode: 'high', hvac_action: 'fan', temperature: null, target_temp_low: null, target_temp_high: null, supported_features: 411 }),
};

function hsToRgb(h, s) {
  s /= 100; const f = (n) => { const k = (n + h / 60) % 6; return 1 - s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5), f(3), f(1)].map((x) => Math.round(x * 255));
}
function kelvinToRgb(k) {
  const t = k / 100; let r, g, b;
  r = t <= 66 ? 255 : 329.7 * (t - 60) ** -0.1332;
  g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * (t - 60) ** -0.0755;
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  return [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))));
}

const simTimers = {};
const simMedia = {};
// Retro House (whole-house) snapshot 2026-10-30 01:30; zone members generated generically for simulation.
const HOUSE = ROOMS.house;
const nice = (id) => id.split('.')[1].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const LIGHT_CT = { supported_color_modes: ['color_temp', 'xy'], color_mode: 'color_temp', color_temp_kelvin: 2000, min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6535, rgb_color: [255, 137, 14] };
const HOUSE_SEED = {
  'light.main_floor_lights': S('on', { friendly_name: 'Main Floor Lights', brightness: 4, ...LIGHT_CT, entity_id: HOUSE.zones[0][2] }),
  'light.kitchen': S('on', { friendly_name: 'Kitchen Hue Lights', brightness: 4, ...LIGHT_CT, entity_id: HOUSE.zones[1][2] }),
  'light.cabinet_lights': S('on', { friendly_name: 'Cabinet Lights', brightness: 254, supported_color_modes: ['brightness'], color_mode: 'brightness' }),
  'light.fire_room': S('on', { friendly_name: 'Fire Room', brightness: 4, ...LIGHT_CT, entity_id: HOUSE.zones[3][2] }),
  'light.plant_lights': S('on', { friendly_name: 'Plant Lights', supported_color_modes: ['onoff'], color_mode: 'onoff', entity_id: HOUSE.zones[7][2] }),
  'scene.whole_house_lights_relax': S('2026-10-05T05:03:48+00:00', { friendly_name: 'All Hue Lights Relax' }),
  'scene.kitchen_ambiance': S('2026-06-08T01:57:40+00:00', { friendly_name: 'Kitchen Ambiance' }),
  'input_button.cabin_lcars_reload_all': S('2026-11-06T20:23:17+00:00', { friendly_name: 'CabinLCARS Reload All Consoles' }),
  'input_button.cabin_lcars_reload_kitchen': S('2026-11-06T20:23:17+00:00', { friendly_name: 'CabinLCARS Reload Kitchen Display' }),
  'input_button.find_tricorder': S('2026-04-28T05:56:49+00:00', { friendly_name: 'Find Tricorder' }),
  'input_button.find_katie_s_iphone': S('2024-12-18T06:04:22+00:00', { friendly_name: "Find Katie's iPhone" }),
  'input_button.find_orion_s_ipad': S('unknown', { friendly_name: "Find Orion's iPad" }),
  'input_button.find_work_ipad': S('unknown', { friendly_name: 'Find Work ipad' }),
  'input_boolean.polycaltoggle': S('off', { friendly_name: 'PolyCalToggle' }),
  'input_boolean.cameratoggle': S('off', { friendly_name: 'CameraToggle' }),
  'media_player.the_frame_kitchen': S('off', { friendly_name: 'The Frame - Kitchen', supported_features: 24381 }),
  'switch.adaptive_lighting_retro_house_adaptive_lighting': S('on', { friendly_name: 'Adaptive Lighting: Retro House Adaptive Lighting' }),
  'light.keypadlinc_on_off_25_6b_20_button_b': S('off', { friendly_name: 'KeypadLinc Button B', supported_color_modes: ['onoff'] }),
  'light.on_off_module_36_6d_eb': S('off', { friendly_name: 'OutletLinc - Workdesk Lamp', supported_color_modes: ['onoff'] }),
};
// Tesla Fleet snapshot 2026-10-31 14:27 (both cars awake). Raichu shown charging so the glow can be previewed.
function carSeed(p, name, o) {
  const id = (d, k) => `${d}.${p}_${k}`;
  const z = {
    [id('binary_sensor', 'status')]: S(o.asleep ? 'off' : 'on', { friendly_name: `${name} Status`, device_class: 'connectivity' }),
    [id('sensor', 'last_check_in')]: S(new Date(Date.now() - (o.checkInMin ?? 6) * 60000).toISOString(), { friendly_name: `${name} Last Check In`, device_class: 'timestamp' }),
    [id('device_tracker', 'location')]: S(o.where?.state ?? 'home', { friendly_name: `${name} Location`, latitude: o.where?.lat ?? 44.9778, longitude: o.where?.lon ?? -93.2650, gps_accuracy: 0 }),
    [id('device_tracker', 'route')]: S('unknown', { friendly_name: `${name} Route`, ...(o.route ? { latitude: o.route.lat, longitude: o.route.lon } : {}) }),
    [id('sensor', 'destination')]: S(o.route?.name ?? 'unknown', { friendly_name: `${name} Destination` }),
    [id('sensor', 'distance_to_arrival')]: S(o.route ? String(o.route.mi) : 'unknown', { friendly_name: `${name} Distance to arrival`, unit_of_measurement: 'mi', device_class: 'distance' }),
    [id('sensor', 'time_to_arrival')]: S(o.route ? new Date(Date.now() + o.route.min * 60000).toISOString() : 'unavailable', { friendly_name: `${name} Time to arrival`, device_class: 'timestamp' }),
    [id('sensor', 'speed')]: S(String(o.speed ?? 0), { friendly_name: `${name} Speed`, unit_of_measurement: 'mph', device_class: 'speed' }),
    [id('sensor', 'shift_state')]: S(o.gear ?? 'p', { friendly_name: `${name} Shift state` }),
    [id('update', 'update')]: S(o.update ? 'on' : 'off', { installed_version: '2026.38.5.1', latest_version: o.update ? '2026.38.5.11' : '2026.38.5.1' }),
    [id('sensor', 'battery_level')]: S(String(o.level)), [id('sensor', 'battery_range')]: S(String(o.range)),
    [id('sensor', 'charging')]: S(o.charging ? 'charging' : 'disconnected', { options: ['starting', 'charging', 'stopped', 'complete', 'disconnected', 'no_power'] }),
    [id('sensor', 'charger_power')]: S(o.charging ? '7' : '0'), [id('sensor', 'charge_energy_added')]: S(o.charging ? '12.4' : '36.24'),
    [id('sensor', 'time_to_full_charge')]: S(o.charging ? new Date(Date.now() + 100 * 60000).toISOString() : 'unavailable'),
    [id('number', 'charge_limit')]: S(String(o.limit), { min: 50, max: 100, step: 1 }),
    [id('switch', 'charge')]: S(o.charging ? 'on' : 'off'),
    [id('binary_sensor', 'charge_cable')]: S(o.charging ? 'on' : 'off'),
    [id('cover', 'charge_port_door')]: S(o.charging ? 'open' : 'closed', { supported_features: 3 }),
    [id('cover', 'frunk')]: S('closed', { supported_features: 1 }), [id('cover', 'trunk')]: S('closed', { supported_features: 3 }),
    [id('cover', 'windows')]: S('closed', { supported_features: 3 }),
    [id('lock', 'lock')]: S('locked'),
    [id('climate', 'climate')]: S('off', { hvac_modes: ['heat_cool', 'off'], current_temperature: o.cabin, temperature: 71.5, preset_mode: 'off' }),
    [id('sensor', 'inside_temperature')]: S(String(o.cabin)), [id('sensor', 'outside_temperature')]: S('54.5'),
    [id('switch', 'defrost')]: S('off'), [id('switch', 'sentry_mode')]: S('off'),
    [id('switch', 'auto_seat_climate_left')]: S('off'), [id('switch', 'auto_steering_wheel_heater')]: S('off'),
    [id('select', 'seat_heater_front_left')]: S('off', { options: ['off', 'low', 'medium', 'high'] }),
    [id('select', 'steering_wheel_heater')]: S('off', { options: ['off', 'low', 'high'] }),
  };
  for (const d of ['front_driver', 'front_passenger', 'rear_driver', 'rear_passenger']) { z[id('binary_sensor', `${d}_door`)] = S('off', { device_class: 'door' }); z[id('binary_sensor', `${d}_window`)] = S('off', { device_class: 'window' }); }
  for (const b of ['wake', 'flash_lights', 'honk_horn', 'homelink']) z[id('button', b)] = S('unknown');
  for (const [k, v] of Object.entries(o.tires ?? {})) { z[id('sensor', `tire_pressure_${k}`)] = S(String(v), { unit_of_measurement: 'psi' }); z[id('binary_sensor', `tire_pressure_warning_${k}`)] = S('off', { device_class: 'problem' }); }
  Object.assign(z, {
    [id('sensor', 'odometer')]: S(String(o.odo), { unit_of_measurement: 'mi' }),
    [id('sensor', 'usable_battery_level')]: S(String(o.level - 1), { unit_of_measurement: '%' }),
    [id('sensor', 'estimate_battery_range')]: S(String(Math.round(o.range * 0.87)), { unit_of_measurement: 'mi' }),
    [id('sensor', 'ideal_battery_range')]: S(String(o.range), { unit_of_measurement: 'mi' }),
    [id('sensor', 'power')]: S('0', { unit_of_measurement: 'kW' }),
    [id('sensor', 'charger_voltage')]: S(o.charging ? '240' : '2', { unit_of_measurement: 'V' }), [id('sensor', 'charger_current')]: S(o.charging ? '32' : '0', { unit_of_measurement: 'A' }),
    [id('number', 'charge_current')]: S('48', { unit_of_measurement: 'A', min: 0, max: 48 }),
    [id('sensor', 'driver_temperature_setting')]: S('71.6', { unit_of_measurement: '°F' }),
    [id('binary_sensor', 'battery_heater')]: S('off', { device_class: 'heat' }), [id('binary_sensor', 'dashcam')]: S('off', { device_class: 'running' }),
    [id('binary_sensor', 'preconditioning')]: S('off'), [id('binary_sensor', 'user_present')]: S('off', { device_class: 'presence' }),
    [id('climate', 'cabin_overheat_protection')]: S('cool', { temperature: 104 }),
    [id('lock', 'charge_cable_lock')]: S('locked'), [id('select', 'seat_heater_front_right')]: S('off'),
    [id('media_player', 'media_player')]: S('idle', { source: 'Spotify' }),
  });
  return z;
}
const CAR_SEED = {
  'zone.home': S('0', { friendly_name: 'Home', latitude: 44.9778, longitude: -93.2650, radius: 100 }),
  ...carSeed('raichu', 'Raichu', { odo: 77986, level: 71, range: 200, limit: 80, cabin: 56.3, update: true, charging: true, checkInMin: 6, tires: { front_left: 42, front_right: 42, rear_left: 41, rear_right: 42 } }),
  ...carSeed('tessie', 'Tessie', { odo: 115986, level: 86, range: 210.94, limit: 90, cabin: 54.5, checkInMin: 3, where: { state: 'not_home', lat: 45.0662, lon: -93.1835 }, speed: 47, gear: 'd', route: { name: 'Home', lat: 44.9778, lon: -93.2650, mi: 9.4, min: 16 }, tires: { front_left: 35.17, front_right: 36.26, rear_left: 39.89, rear_right: 36.62 } }),
};

export function simulate(seed) {
  const all = { ...seed, ...HOUSE_SEED, ...CAR_SEED };
  for (const [, , m] of HOUSE.zones) for (const id of m) if (!all[id]) all[id] = S('on', { friendly_name: nice(id), brightness: 4 });
  batch(() => { for (const [id, st] of Object.entries(all)) ent(id).value = structuredClone(st); });

  const get = (id) => ent(id).peek();
  const put = (id, patch, attrs) => {
    const cur = get(id); if (!cur) return;
    const t = now();
    const n = { ...cur, ...patch, attributes: { ...cur.attributes, ...(attrs ?? {}) }, last_updated: t };
    if (patch.state !== undefined && patch.state !== cur.state) n.last_changed = t;
    ent(id).value = n;
  };
  const avail = (id) => get(id) && get(id).state !== 'unavailable';

  function lightOn(id, data) {
    const a = {};
    if (data.brightness_pct != null) a.brightness = Math.round(data.brightness_pct * 2.55);
    if (data.color_temp_kelvin != null) Object.assign(a, { color_mode: 'color_temp', color_temp_kelvin: data.color_temp_kelvin, rgb_color: kelvinToRgb(data.color_temp_kelvin), hs_color: null });
    if (data.hs_color) Object.assign(a, { color_mode: 'xy', hs_color: data.hs_color, rgb_color: hsToRgb(...data.hs_color), color_temp_kelvin: null });
    const cur = get(id);
    if (cur.attributes.brightness == null && a.brightness == null && cur.attributes.supported_color_modes?.[0] !== 'onoff') a.brightness = 128;
    put(id, { state: 'on' }, a);
    for (const m of cur.attributes.entity_id ?? []) if (avail(m)) put(m, { state: 'on' }, a.brightness ? { brightness: a.brightness } : {});
  }
  function lightOff(id) {
    const cur = get(id);
    put(id, { state: 'off' }, { brightness: null });
    for (const m of cur.attributes.entity_id ?? []) if (avail(m)) put(m, { state: 'off' }, { brightness: null });
  }
  function regroupLights(group, members) {
    const on = members.filter((m) => get(m)?.state === 'on');
    if (on.length) put(group, { state: 'on' }, { brightness: get(group).attributes.brightness ?? 128 });
    else put(group, { state: 'off' }, { brightness: null });
  }
  function coverPos(id, pos) {
    const cur = get(id);
    put(id, { state: pos > 0 ? 'open' : 'closed' }, { current_position: pos });
    for (const m of cur.attributes.entity_id ?? []) put(m, { state: pos > 0 ? 'open' : 'closed' }, { current_position: pos });
  }

  const H = {
    light: {
      toggle: (id) => (get(id).state === 'on' ? lightOff(id) : lightOn(id, {})),
      turn_on: (id, d) => lightOn(id, d),
      turn_off: (id) => lightOff(id),
    },
    cover: {
      toggle: (id) => coverPos(id, get(id).attributes.current_position > 0 ? 0 : 100),
      open_cover: (id) => coverPos(id, 100),
      close_cover: (id) => coverPos(id, 0),
      stop_cover: () => {},
      set_cover_position: (id, d) => coverPos(id, d.position),
    },
    fan: { toggle: (id) => put(id, { state: get(id).state === 'on' ? 'off' : 'on' }) },
    switch: {
      toggle: (id) => put(id, { state: get(id).state === 'on' ? 'off' : 'on' }),
      turn_on: (id) => { put(id, { state: 'on' }); if (/_charge$/.test(id)) put(id.replace('switch.', 'sensor.').replace(/_charge$/, '_charging'), { state: 'charging' }); },
      turn_off: (id) => { put(id, { state: 'off' }); if (/_charge$/.test(id)) put(id.replace('switch.', 'sensor.').replace(/_charge$/, '_charging'), { state: 'stopped' }); },
    },
    select: {
      select_option: (id, d) => {
        if (/steering_wheel/.test(id) && d.option === 'high') throw new Error('INVALID STEERING WHEEL HEAT LEVEL 2; EXPECTED 0, 1 OR 3');
        put(id, { state: d.option });
        const auto = id.replace('select.', 'switch.').replace('_seat_heater_front_left', '_auto_seat_climate_left').replace('_steering_wheel_heater', '_auto_steering_wheel_heater');
        if (get(auto)) put(auto, { state: 'off' });
      },
    },
    lock: { lock: (id) => put(id, { state: 'locked' }), unlock: (id) => put(id, { state: 'unlocked' }) },
    number: { set_value: (id, d) => put(id, { state: String(d.value) }) },
    button: { press: (id) => put(id, { state: iso() }) },
    input_boolean: {
      toggle: (id) => put(id, { state: get(id).state === 'on' ? 'off' : 'on' }),
      turn_on: (id) => put(id, { state: 'on' }), turn_off: (id) => put(id, { state: 'off' }),
    },
    automation: {
      trigger: (id) => {
        put(id, {}, { current: 1, last_triggered: iso() });
        clearTimeout(simTimers[id]);
        simTimers[id] = setTimeout(() => batch(() => { put(id, {}, { current: 0 }); put('input_boolean.away_mode', { state: 'on' }); }), 120000);
      },
      turn_off: (id) => { clearTimeout(simTimers[id]); put(id, { state: 'off' }, { current: 0 }); },
      turn_on: (id) => put(id, { state: 'on' }),
    },
    input_button: { press: (id) => put(id, { state: iso() }) },
    scene: {
      turn_on: (id) => {
        put(id, { state: iso() });
        if (id === 'scene.master_bed_dimmed') lightOn('light.master_bed', { brightness_pct: 30, color_temp_kelvin: 2200 });
        if (id === 'scene.master_bed_tokyo') lightOn('light.master_bed', { brightness_pct: 75, hs_color: [320, 80] });
        if (id === 'scene.im_being_blinded') coverPos('cover.blind_primary_bed_1', 0);
      },
    },
    media_player: {
      media_play_pause: (id) => put(id, { state: get(id).state === 'playing' ? 'paused' : 'playing' }),
      media_next_track: () => {}, media_previous_track: () => {},
      volume_up: () => {}, volume_down: () => {},
      volume_set: (id, d) => put(id, {}, { volume_level: d.volume_level }),
      volume_mute: (id, d) => put(id, {}, { is_volume_muted: d.is_volume_muted }),
      shuffle_set: (id, d) => put(id, {}, { shuffle: d.shuffle }),
      repeat_set: (id, d) => put(id, {}, { repeat: d.repeat }),
      media_stop: (id) => put(id, { state: 'idle' }, { media_title: null, media_artist: null, media_album_name: null }),
      turn_off: (id) => put(id, { state: 'off' }, { media_title: null }),
      turn_on: (id) => put(id, { state: 'idle' }),
      toggle: (id) => put(id, { state: get(id).state === 'off' ? 'on' : 'off' }),
    },
    music_assistant: {
      play_media: (id, d) => put(id, { state: 'playing' }, { media_title: String([].concat(d.media_id)[0]).replace(/\/$/, '').split('/').pop().replace(/^\d+$/, 'TRACK 1'), media_artist: (d.media_type ?? '').toUpperCase(), media_album_name: '', media_duration: 210, media_position: 0, media_position_updated_at: new Date().toISOString(), app_id: 'music_assistant' }),
    },
    climate: {
      set_hvac_mode: (id, d) => put(id, { state: d.hvac_mode }, { hvac_action: { off: 'off', fan_only: 'fan', cool: 'cooling', heat: 'heating', heat_cool: 'idle' }[d.hvac_mode], ...(d.hvac_mode === 'heat' || d.hvac_mode === 'cool' ? { temperature: 70, target_temp_low: null, target_temp_high: null } : d.hvac_mode === 'heat_cool' ? { temperature: null, target_temp_low: 66, target_temp_high: 74 } : { temperature: null, target_temp_low: null, target_temp_high: null }) }),
      set_fan_mode: (id, d) => put(id, {}, { fan_mode: d.fan_mode }),
      set_preset_mode: (id, d) => put(id, {}, { preset_mode: d.preset_mode }),
      set_temperature: (id, d) => put(id, {}, d),
      turn_on: (id) => put(id, { state: 'heat_cool' }),
      turn_off: (id) => put(id, { state: 'off' }),
    },
  };

  // preview hook: ?kmode=calendar|camera turns on the kitchen display's mode toggles
  const km = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('kmode') : null;
  if (km === 'calendar') put('input_boolean.polycaltoggle', { state: 'on' });
  if (km === 'camera') put('input_boolean.cameratoggle', { state: 'on' });
  // preview hook: ?doors=front,kitchen,garage,fire_room opens those door contacts (and the group)
  const dq = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('doors') : null;
  // preview hook: ?caralert=1 opens Raichu's frunk and driver door and unlocks it
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('caralert')) {
    put('cover.raichu_frunk', { state: 'open' }); put('binary_sensor.raichu_front_driver_door', { state: 'on' }); put('lock.raichu_lock', { state: 'unlocked' });
  }
  if (dq) {
    for (const k of dq.split(',')) put(`binary_sensor.${k === 'front' ? 'front_door' : `${k}_entry`}_contact_input`, { state: 'on' });
    put('binary_sensor.all_doors', { state: 'on' });
  }

  return {
    auth: null,
    async callService(domain, service, data, target) {
      await new Promise((r) => setTimeout(r, 220));
      const ids = [].concat(target?.entity_id ?? []);
      const fn = H[domain]?.[service];
      if (!fn) throw new Error('NO HANDLER');
      for (const id of ids) {
        const st = get(id);
        if (!st) throw new Error('ENTITY NOT FOUND');
        if (st.state === 'unavailable') throw new Error('UNIT OFFLINE');
      }
      batch(() => {
        for (const id of ids) {
          fn(id, data);
          if (domain === 'light' && LIGHT_MEMBERS.includes(id)) regroupLights('light.master_bed', LIGHT_MEMBERS);
          if (domain === 'light' && VR_MEMBERS.includes(id)) regroupLights('light.vr_room', VR_MEMBERS);
        }
      });
    },
    // In-memory stand-in for HA's media library (simulation only; nothing is shared or kept).
    async mediaBrowse(id) {
      if (id === 'media-source://media_source/local') return { children: [] };
      if (!id.endsWith('/cabin-lcars-sounds')) throw new Error('NOT FOUND');
      return { children: Object.entries(simMedia).map(([name, f]) => ({ title: name, media_content_id: `${id}/${name}`, url: f.url })) };
    },
    async mediaResolve(id) { const f = simMedia[id.split('/').pop()]; if (!f) throw new Error('NOT FOUND'); return { url: f.url, mime_type: f.type }; },
    async mediaUpload(folder, file) { await new Promise((r) => setTimeout(r, 300)); simMedia[file.name] = { url: URL.createObjectURL(file), type: file.type }; return { media_content_id: `${folder}/${file.name}` }; },
    async mediaRemove(id) { const n = id.split('/').pop(); if (simMedia[n]) { URL.revokeObjectURL(simMedia[n].url); delete simMedia[n]; } },
    mediaFetch(url) { return fetch(url); },
    async device(name) { return { name, manufacturer: 'Tesla', model: name === 'Raichu' ? 'Model Y' : 'Model 3', serial_number: 'SIMULATION' }; },
    // Music Assistant library stand-in (simulation only): sample names, not the real library.
    async serviceResponse(domain, service, data) {
      await new Promise((r) => setTimeout(r, 250));
      if (domain === 'music_assistant' && service === 'get_library') {
        const names = {
          playlist: ['Focus Flow', 'Dinner Jazz', 'Road Trip', 'Rainy Day', 'Workout Mix', 'Sunday Morning', 'Synthwave Drive', '80s Hits', 'Chill Lofi', 'Classic Rock', 'Indie Discovery', 'Piano Moods', 'Kids Party', 'Late Night'],
          album: ["Hurry Up, We're Dreaming", 'Random Access Memories', 'Currents', 'In Rainbows', 'Discovery', 'Melodrama', 'Blue Banisters', 'The Suburbs'],
          artist: ['Arcade Fire', 'Daft Punk', 'Lorde', 'M83', 'Radiohead', 'Tame Impala', 'Phoebe Bridgers', 'Vampire Weekend'],
          radio: ['KEXP 90.3', 'The Current 89.3', 'Jazz88', 'SomaFM Groove Salad', 'BBC Radio 6 Music'],
        }[data.media_type] ?? [];
        const off = data.offset ?? 0, lim = data.limit ?? 25;
        return { items: names.slice(off, off + lim).map((n, i) => ({ media_type: data.media_type, uri: `library://${data.media_type}/${off + i + 1}`, name: n, ...(data.media_type === 'album' ? { artists: [{ name: 'SAMPLE ARTIST' }] } : {}) })), limit: lim, offset: off };
      }
      if (domain === 'music_assistant' && service === 'search') {
        // Sample catalog (simulation only; real searches go to Music Assistant). Names from a 2026-11-20 Apple Music search.
        const A = (n) => [{ media_type: 'artist', name: n, uri: `sim://artist/${n}` }];
        const al = (name, version = '') => ({ media_type: 'album', uri: `sim://album/${name}/${version}`, name, version, image: null, artists: A('Daft Punk') });
        const albums = [al('Random Access Memories'), al('Discovery'), al('TRON: Legacy', 'The Complete Edition (Original Motion Picture Soundtrack)'), al('Human After All'), al('Random Access Memories', '10th Anniversary Edition'), al('Homework'), al('TRON: Legacy (Original Motion Picture Soundtrack)'), al('Homework', '25th Anniversary Edition'), al('Musique, Vol. 1 (1993-2005)'), al('Random Access Memories', 'Drumless Edition')];
        const tr = (name, album, artist = 'Daft Punk') => ({ media_type: 'track', uri: `sim://track/${name}`, name, version: '', image: null, artists: A(artist), album: { name: album } });
        const tracks = [tr('One More Time', 'Discovery'), tr('Get Lucky', 'Random Access Memories', 'Daft Punk, Pharrell Williams & Nile Rodgers'), tr('Around the World', 'Homework'), tr('Instant Crush', 'Random Access Memories', 'Daft Punk & Julian Casablancas'), tr('Harder Better Faster Stronger', 'Discovery'), tr('Digital Love', 'Discovery'), tr('Robot Rock', 'Human After All'), tr('Veridis Quo', 'Discovery')];
        const types = [].concat(data.media_type ?? ['artist', 'album', 'track', 'playlist']);
        const lim = data.limit ?? 5;
        return {
          artists: types.includes('artist') ? [{ media_type: 'artist', uri: 'sim://artist/daft-punk', name: 'Daft Punk', image: null }] : [],
          albums: types.includes('album') ? albums.slice(0, lim) : [],
          tracks: types.includes('track') ? tracks.slice(0, lim) : [],
          playlists: types.includes('playlist') ? [{ media_type: 'playlist', uri: 'sim://playlist/essentials', name: 'Daft Punk Essentials', image: null }] : [],
          radio: [], audiobooks: [], podcasts: [],
        };
      }
      throw new Error('NO HANDLER');
    },
    async history(ids, start, end) {
      // Placeholder thermostat history for simulation only: 10-minute samples, a setback overnight, heat cycles.
      const out = {}; const t0 = +start, t1 = +end;
      for (const id of ids) {
        if (!id.startsWith('climate.')) {
          // switches: simulated pump doses, ~36 s every ~41 min
          const rows = [{ t: t0, s: 'off', a: {} }];
          for (let t = t0 + 600e3; t < t1; t += 41 * 60e3 + ((t / 1e3) % 7) * 60e3) { rows.push({ t, s: 'on', a: {} }, { t: t + 36e3, s: 'off', a: {} }); }
          out[id] = rows; continue;
        }
        const cur0 = seed[id]?.attributes?.current_temperature ?? 66, set0 = seed[id]?.attributes?.temperature ?? 65;
        const rows = []; let cur = cur0 - 2; let heat = false;
        for (let t = t0; t <= t1; t += 600e3) {
          const h = new Date(t).getHours(); const set = h >= 23 || h < 6 ? set0 - 3 : set0;
          if (cur < set - 0.6) heat = true; if (cur > set + 0.8) heat = false;
          cur += heat ? 0.45 : -0.18 + Math.sin(t / 3.6e6) * 0.05;
          rows.push({ t, s: 'heat', a: { current_temperature: Math.round(cur * 10) / 10, temperature: set, hvac_action: heat ? 'heating' : 'idle' } });
        }
        out[id] = rows;
      }
      return out;
    },
    async forecast(eid, type) {
      // Placeholder forecast for simulation only; live mode calls weather.get_forecasts.
      const conds = ['partlycloudy', 'cloudy', 'rainy', 'sunny', 'sunny', 'partlycloudy', 'snowy'];
      const base = new Date(); base.setMinutes(0, 0, 0);
      if (type === 'hourly') return Array.from({ length: 12 }, (_, i) => ({ datetime: new Date(+base + (i + 1) * 3600e3).toISOString(), condition: i < 5 ? 'cloudy' : 'partlycloudy', temperature: 48 - Math.round(i / 3), dew_point: 47, precipitation_probability: i < 4 ? 10 : 30 }));
      if (type === 'twice_daily') return Array.from({ length: 13 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + Math.floor(i / 2)); d.setHours(i % 2 ? 18 : 6); if (i === 0) d.setHours(10); const n = i % 2; return { datetime: d.toISOString(), is_daytime: !n, condition: n ? 'cloudy' : conds[i / 2], temperature: n ? 41 - (i >> 1) : 55 - (i >> 1), precipitation_probability: [24, 22, 9, 11, 100, 97, 78, 55, 41, 19, 18, 10, 11][i] }; });
      return Array.from({ length: 6 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + i); d.setHours(12); return { datetime: d.toISOString(), condition: conds[i], temperature: 55 - i, templow: 41 - i, precipitation_probability: [10, 20, 70, 0, 5, 15][i] }; });
    },
    async events(eid, start) {
      // Placeholder agenda for simulation only; live mode reads the real calendars.
      const d0 = new Date(start); d0.setHours(0, 0, 0, 0);
      const at = (day, h, m) => { const d = new Date(d0); d.setDate(d.getDate() + day); d.setHours(h, m, 0, 0); return d.toISOString(); };
      const ev = (day, h, m, dur, summary) => ({ summary, start: { dateTime: at(day, h, m) }, end: { dateTime: new Date(Date.parse(at(day, h, m)) + dur * 60000).toISOString() } });
      const rel = (minsFromNow, dur, summary) => { const t = Date.now() + minsFromNow * 60000; return { summary, start: { dateTime: new Date(t).toISOString() }, end: { dateTime: new Date(t + dur * 60000).toISOString() } }; };
      if (eid === 'calendar.elam_noor_916') return [rel(-20, 45, 'SAMPLE: IN-PROGRESS MEETING'), rel(3, 30, 'SAMPLE: STARTS IN 3 MIN'), rel(0.25, 15, 'SAMPLE: CHIRP TEST (15 S)'), ev(0, 9, 0, 60, 'SAMPLE: STAFF MEETING'), ev(0, 13, 30, 30, 'SAMPLE: VENDOR CALL'), ev(1, 10, 0, 90, 'SAMPLE: NETWORK REVIEW'), ev(3, 8, 30, 60, 'SAMPLE: CABINET MEETING'), ev(3, 14, 0, 45, 'SAMPLE: SECURITY BRIEFING'), ev(4, 11, 0, 60, 'SAMPLE: BUDGET REVIEW'), ev(5, 9, 0, 120, 'SAMPLE: PROJECT KICKOFF')];
      if (eid === 'calendar.llm_vision_timeline') return [rel(-300, 1, 'Package delivered'), rel(-120, 1, 'Person at door'), rel(-25, 1, 'No activity observed')].map((x, i) => ({ ...x, description: ['SAMPLE: A courier leaves a box on the step and walks back to a van.', 'SAMPLE: One person rings the bell, waits, then leaves.', 'SAMPLE: No activity observed.'][i] }));
      if (eid === 'calendar.poly_calendar') return [{ summary: 'SAMPLE: FRIENDS ALL-DAY', start: { date: at(2, 0, 0).slice(0, 10) }, end: { date: at(3, 0, 0).slice(0, 10) } }, ev(4, 19, 0, 120, 'SAMPLE: GAME NIGHT')];
      if (eid === 'calendar.katie_personal') return [ev(0, 8, 5, 60, 'SAMPLE: SCHOOL DROP-OFF'), ev(0, 17, 30, 60, 'SAMPLE: PICKUP'), ev(1, 9, 0, 60, 'SAMPLE: STUDIO'), ev(3, 12, 0, 60, 'SAMPLE: LUNCH')];
      if (eid === 'calendar.cramer_tiny_cabins_turnover') return [ev(1, 6, 0, 60, 'SAMPLE: PLAY IN OR CLEAN ROOM')];
      return [ev(0, 18, 0, 60, 'SAMPLE: DINNER'), ev(0, 20, 0, 60, '💪 Exercise'), ev(1, 7, 30, 30, 'SAMPLE: SCHOOL DROP-OFF'), { summary: 'SAMPLE: ALL-DAY ITEM', start: { date: at(1, 0, 0).slice(0, 10) }, end: { date: at(2, 0, 0).slice(0, 10) } }];
    },
  };
}

// Cabin (Tiny Cabins) snapshot for the MASTER SYSTEMS STATUS preview: live values read 2026-11-22 23:29 CST.
const C = (state, attributes = {}) => ({ state, attributes, last_changed: now() - 600, last_updated: now() - 600 });
Object.assign(SEED, {
  'switch.log_cabin_emergency_water_shutoff': C('on'),
  'binary_sensor.water_leak_sensor_log_cabin_bathroom_water_leak_detected': C('off'),
  'binary_sensor.water_leak_sensor_log_cabin_kitchen_water_leak_detected': C('off'),
  'binary_sensor.log_cabin_emergency_water_shutoff_water_leak_detected': C('off'),
  'binary_sensor.log_cabin_emergency_water_shutoff_valve_jammed': C('off'),
  'binary_sensor.log_cabin_emergency_water_shutoff_back_up_battery_disconnected': C('on'),
  'switch.outdoor_plug_1': C('on'),
  'binary_sensor.water_main_temp_sensor_moisture_alarm': C('off'),
  'sensor.septic_monitor_node_status': C('alive'),
  'counter.septic_daily_run_counter': C('12'),
  'binary_sensor.log_cabin_smoke_co_sensor_smoke_detected': C('off'),
  'binary_sensor.log_cabin_smoke_co_sensor_carbon_monoxide_detected': C('off'),
  'binary_sensor.crawlspace_temp_sensor_moisture_alarm': C('off'),
  'lock.bunk_house_yale_assure_lock_bunkhouse': C('unlocked'),
  'binary_sensor.bunk_house_front_door_sensor': C('off'),
  'binary_sensor.bunkhouse_couch_window_sensor_intrusion': C('on'),
  'binary_sensor.bunk_house_yale_assure_lock_bunkhouse_replace_battery_soon': C('off'),
  'binary_sensor.broadcom_adsl_router_wan_status': C('on'),
  'binary_sensor.remote_ui': C('on'),
  'binary_sensor.slzb_mrw10_internet': C('on'),
  'sensor.water_main_temp_sensor_air_temperature': C('55.1'),
  'sensor.crawlspace_temp_sensor_air_temperature': C('52.2'),
  'climate.log_cabin_main_thermostat': C('heat', { current_temperature: 67, temperature: 67, hvac_action: 'idle' }),
  'climate.log_cabin_fireplace_thermostat': C('heat', { current_temperature: 68, temperature: 55, hvac_action: 'idle' }),
  'climate.bunk_main_thermostat': C('heat', { current_temperature: 78, temperature: 65, hvac_action: 'idle' }),
  'climate.bunk_bath_thermostat_thermostat': C('heat', { current_temperature: 68, temperature: 65, hvac_action: 'idle' }),
  'sensor.water_main_temp_sensor_humidity': C('75.0'),
  'sensor.crawlspace_temp_sensor_humidity': C('72.0'),
  'sensor.shelly_humidity_and_temp_sensor_log_cabin_humidity': C('53.2'),
  'sensor.bunk_main_thermostat_humidity': C('26'),
  'sensor.apollo_air_1_7bc400_co2': C('1317.0'),
  'sensor.envoy_122117017195_current_power_production': C('0'),
  'sensor.envoy_122117017195_today_s_energy_production': C('0'),
  'calendar.log_cabin_rental_calendar': C('on', { message: 'Blocked-off time # ORB17698774', start_time: '2026-11-20 16:00:00', end_time: '2026-12-04 10:00:00' }),
  'calendar.bunk_house_calendar': C('on', { message: 'Blocked-off time # ORB17698773', start_time: '2026-11-20 16:00:00', end_time: '2026-11-30 10:00:00' }),
  'sensor.hours_since_log_cabin_activity': C('0.0'),
  'sensor.hours_since_bunk_house_activity': C('0.0'),
  'binary_sensor.log_cabin_presence_sensor_log_cabin_presence_sensor_1': C('off'),
  'binary_sensor.bunk_presence_sensor_presence_sensor_1': C('on'),
  'weather.forecast_tiny_cabins': C('cloudy', { temperature: 37, humidity: 74, wind_speed: 18.58, wind_bearing: 342.6 }),
});

// Detail-page snapshot: live values read 2026-11-23 12:53 CST.
Object.assign(SEED, {
  "binary_sensor.log_cabin_emergency_water_shutoff_on_open": C("off"),
  "binary_sensor.log_cabin_emergency_water_shutoff_ac_mains_disconnected": C("off"),
  "binary_sensor.log_cabin_emergency_water_shutoff_back_up_battery_is_low": C("off"),
  "binary_sensor.log_cabin_emergency_water_shutoff_overheat_detected": C("off"),
  "binary_sensor.log_cabin_emergency_water_shutoff_underheat_detected": C("off"),
  "sensor.log_cabin_emergency_water_shutoff_air_temperature": C("71.96"),
  "sensor.log_cabin_emergency_water_shutoff_node_status": C("alive"),
  "sensor.water_leak_sensor_log_cabin_bathroom_battery_level": C("100.0"),
  "sensor.water_leak_sensor_log_cabin_kitchen_battery_level": C("20.0"),
  "sensor.water_leak_sensor_log_cabin_bathroom_node_status": C("asleep"),
  "sensor.water_leak_sensor_log_cabin_kitchen_node_status": C("asleep"),
  "binary_sensor.water_main_temp_sensor_underheat_detected": C("off"),
  "binary_sensor.water_main_temp_sensor_overheat_detected": C("off"),
  "sensor.outdoor_plug_1_node_status": C("alive"),
  "sensor.water_main_temp_sensor_battery_level": C("100.0"),
  "sensor.water_main_temp_sensor_node_status": C("asleep"),
  "button.septic_monitor_ping": C("2026-11-23T12:00:00.199663+00:00"),
  "switch.septic_monitor": C("off"),
  "switch.septic_monitor_3": C("on"),
  "switch.septic_monitor_4": C("on"),
  "switch.septic_monitor_5": C("off"),
  "update.septic_monitor_firmware": C("off"),
  "event.septic_monitor_scene_001": C("2026-06-13T21:06:51.778+00:00"),
  "event.septic_monitor_scene_002": C("unknown"),
  "event.septic_monitor_scene_003": C("unknown"),
  "event.septic_monitor_scene_004": C("unknown"),
  "automation.septic_pump_run_counter": C("on"),
  "automation.septic_pump_run_reset": C("on"),
  "automation.septic_system_power_offline_alert": C("on"),
  "binary_sensor.crawlspace_temp_sensor_underheat_detected": C("off"),
  "sensor.crawlspace_temp_sensor_battery_level": C("78.0"),
  "sensor.crawlspace_temp_sensor_node_status": C("asleep"),
  "sensor.log_cabin_fireplace_thermostat_battery_level": C("96.0"),
  "binary_sensor.log_cabin_smoke_co_sensor_tampering_product_cover_removed": C("off"),
  "binary_sensor.log_cabin_smoke_co_sensor_system_software_failure_with_failure_code": C("off"),
  "sensor.log_cabin_smoke_co_sensor_battery_level": C("99.0"),
  "sensor.log_cabin_smoke_co_sensor_node_status": C("asleep"),
  "alarm_control_panel.wyze_home_monitoring_system": C("disarmed"),
  "binary_sensor.bunk_house_yale_assure_lock_bunkhouse_lock_jammed": C("off"),
  "binary_sensor.bunk_house_yale_assure_lock_bunkhouse_keypad_temporary_disabled": C("off"),
  "sensor.bunk_house_yale_assure_lock_bunkhouse_battery_level": C("97.0"),
  "binary_sensor.bunk_house_yale_assure_lock_bunkhouse_replace_battery_now": C("off"),
  "sensor.bunk_house_yale_assure_lock_bunkhouse_node_status": C("alive"),
  "sensor.bunk_house_front_door_battery_level": C("100.0"),
  "binary_sensor.bunk_house_front_door_tampering_product_cover_removed": C("off"),
  "sensor.bunkhouse_couch_window_sensor_battery_level": C("100.0"),
  "binary_sensor.bunkhouse_couch_window_sensor_tampering_product_cover_removed": C("off"),
  "binary_sensor.log_cabin_entry_person": C("off"),
  "binary_sensor.log_cabin_entry_vehicle": C("off"),
  "binary_sensor.log_cabin_entry_animal": C("off"),
  "binary_sensor.log_cabin_entry_motion": C("off"),
  "binary_sensor.log_cabin_front_doorbell_visitor": C("off"),
  "binary_sensor.log_cabin_front_doorbell_person": C("off"),
  "binary_sensor.log_cabin_front_doorbell_package": C("off"),
  "binary_sensor.log_cabin_front_doorbell_vehicle": C("off"),
  "binary_sensor.slzb_mrw10_ethernet": C("on"),
  "binary_sensor.apollo_air_1_7bc400_online": C("on"),
  "sensor.cabin_control_ipad_battery_level": C("100"),
  "sensor.yale_assure_lock_log_cabin_node_status": C("alive"),
  "sensor.bunk_house_front_door_node_status": C("asleep"),
  "sensor.bunkhouse_couch_window_sensor_node_status": C("asleep"),
  "sensor.log_cabin_fireplace_thermostat_node_status": C("alive"),
  "sensor.log_cabin_scene_controler_node_status": C("alive"),
  "sensor.bunk_house_scene_controller_node_status": C("alive"),
  "sensor.log_cabin_outdoor_outlet_log_cabin_node_status": C("dead"),
  "sensor.bunk_house_outdoor_outlet_bunkhouse_node_status": C("alive"),
  "sensor.zooz_outdoor_outlets_node_status": C("alive"),
});
// Camera page snapshot (2026-11-23 13:25 CST). Feeds need a live link; simulation shows NO FEED.
Object.assign(SEED, {
  'camera.log_cabin_entry_fluent': C('idle'), 'camera.log_cabin_front_doorbell_fluent': C('idle'), 'camera.bunk_house_pano_fluent': C('idle'),
  'binary_sensor.log_cabin_front_doorbell_motion': C('off'),
  'binary_sensor.bunk_house_pano_person': C('on'), 'binary_sensor.bunk_house_pano_vehicle': C('off'), 'binary_sensor.bunk_house_pano_animal': C('off'), 'binary_sensor.bunk_house_pano_motion': C('on'),
});
// Log Cabin lock after secure re-inclusion (2026-11-23 15:55 CST)
Object.assign(SEED, {
  'light.log_cabin_ball_lights': C('off', { friendly_name: 'Log Cabin Accent Lights', supported_color_modes: ['color_temp', 'hs', 'xy'], brightness: null }),
  'light.all_bunk_house_lights': C('on', { friendly_name: 'All Bunk House Lights', supported_color_modes: ['color_temp', 'hs'], brightness: 51 }),
  'light.string_lights': C('on', { friendly_name: 'String Lights', supported_color_modes: ['onoff'] }),
  'lock.yale_assure_lock_log_cabin': C('unlocked'), 'sensor.yale_assure_lock_log_cabin_battery_level': C('34.0'),
  'binary_sensor.yale_assure_lock_log_cabin_lock_jammed': C('off'), 'binary_sensor.yale_assure_lock_log_cabin_keypad_temporary_disabled': C('off'),
  'binary_sensor.yale_assure_lock_log_cabin_replace_battery_now': C('off'),
});

/**
 * Example projects: practical builds with a twist. Each page describes the
 * build and links to a ready-made project file in public/project-files/.
 *
 * The project files are generated: scripts/project-files/graphs.ts holds each
 * project's graph, and `node scripts/project-files/build.mjs` builds and checks
 * them with the app's own code. A new project is an entry here plus its graph
 * there, under the same slug.
 */

export type ProjectCategoryId = "home" | "motion" | "music" | "environment" | "games";

export interface ProjectCategory {
  id: ProjectCategoryId;
  title: string;
  intro: string;
}

export interface Project {
  /** URL segment and project file name. */
  slug: string;
  title: string;
  category: ProjectCategoryId;
  /** One line for the card and under the page title. */
  tagline: string;
  /** The app nodes the build is made from, in the order you meet them. */
  nodes: readonly string[];
  /** What you have when it is finished. */
  result: string;
  howItWorks: readonly string[];
  needs: readonly string[];
  /** Ways to adapt the build once it works. */
  tips?: readonly string[];
  /** A safety limit worth stating before anyone builds it. */
  caution?: string;
}

export const projectCategories: readonly ProjectCategory[] = [
  {
    id: "home",
    title: "Home, practical with a twist",
    intro: "Useful around the house first, clever second: lights that keep watch, give warnings, tell the time and guide you in.",
  },
  {
    id: "motion",
    title: "Tilt, touch and motion",
    intro: "Builds you pick up, flip, shake, touch or blow on. A motion sensor, touch pads or a microphone turns the light into something you play with.",
  },
  {
    id: "music",
    title: "Music and learning",
    intro: "Light that teaches: practise piano, tune an instrument, pace your breathing, or join a real lighting rig.",
  },
  {
    id: "environment",
    title: "Environment and machines",
    intro: "Light that reports on the world around it: weather in a tank, a battery's charge, a hot enclosure, a brewing ferment.",
  },
  {
    id: "games",
    title: "Games and props",
    intro: "Puzzles, game-night scenery, reaction tests, model towns, a prop sword and a full Christmas show.",
  },
];

export const projects: readonly Project[] = [
  // ── Home ──────────────────────────────────────────────────────────────────
  {
    slug: "fake-occupancy-tv",
    title: "Fake-occupancy TV",
    category: "home",
    tagline: "A burglar deterrent that looks like someone is home watching television.",
    nodes: ["TV Simulator", "Light Sensor", "Schedule Trigger", "Random"],
    result: "A small LED panel hidden behind a curtain throws the flickering, colour-shifting glow of a television onto the window. It switches itself on when it gets dark, and switches off at a different time every night, so the house never looks like it runs on a timer.",
    howItWorks: [
      "A DS3231 clock module keeps the time, even through power cuts. A Schedule Trigger opens an evening window from 17:00 to 23:45 and reports how far through the window it is.",
      "When the window opens, Random draws tonight's stop point somewhere between 45% and 95% of the way through, so the TV goes off at a different time each night, between about 20:00 and 23:00.",
      "A light sensor checks that it is actually dark outside, which follows the seasons on its own. The TV runs only when it is dark, inside the window, and before tonight's stop point. TV Simulator does the rest: quick scene cuts between coloured blocks, just like a real screen.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "An 8×8 WS2812B LED matrix panel (64 LEDs)",
      "An LDR light sensor module",
      "A DS3231 real-time clock module with a CR2032 coin cell",
      "A 5 V 5 A power supply",
      "A 330 Ω resistor for the LED data line and a 1000 µF capacitor across the LED power",
      "Jumper wires, and a small stand or bracket to face the panel at the curtain",
    ],
    tips: [
      "Point the light sensor out of a window, away from the panel, so the TV's own glow never convinces it the sun has come up.",
      "Change the evening window and the Random range to match when your household really watches TV.",
      "A bigger panel facing a pale ceiling looks more convincing from the street than a small one facing the glass.",
    ],
  },
  {
    slug: "deaf-accessible-alert",
    title: "Deaf-accessible sound alert",
    category: "home",
    tagline: "The whole room flashes a different colour for the doorbell and the smoke alarm.",
    nodes: ["Microphone", "Frequency Band", "Envelope", "Blend"],
    result: "An LED strip around the ceiling of a room listens for two sounds. When the doorbell rings the room pulses blue for a few seconds; when the smoke alarm sounds it strobes red. Anyone who cannot hear the sound still gets the message, from anywhere in the room.",
    howItWorks: [
      "An I2S microphone feeds two Frequency Band nodes. One listens to the doorbell's chime, around 600–1100 Hz; the other to the piercing 2900–3500 Hz tone most smoke alarms use.",
      "Each band must stay loud for a moment before it counts, which a debounce Trigger checks. That stops talking, music and clattering dishes from setting it off.",
      "A confirmed sound starts an Envelope that holds for about five seconds, multiplied by a square Wave so the colour flashes: a slow blue pulse for the door, a fast red strobe for the alarm. Blend adds both, so you see both if they happen together.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "An INMP441 I2S microphone module",
      "4 m of WS2812B LED strip at 30 LEDs per metre (120 LEDs)",
      "A 5 V 10 A power supply, with power injected at both ends of the strip",
      "A 330 Ω resistor for the data line and a 1000 µF capacitor across the LED power",
      "Aluminium channel or clips to mount the strip around the ceiling",
    ],
    tips: [
      "Record your own doorbell on a phone and look at it in a spectrum app to find its exact tone, then set each band's Low and High Hz to match.",
      "Add a third band and colour for a washing machine's end-of-cycle beep or a baby monitor.",
    ],
    caution: "This is an extra signal, never a replacement for a certified smoke alarm or a certified alerting system for deaf and hard-of-hearing people.",
  },
  {
    slug: "faux-skylight",
    title: "Faux skylight",
    category: "home",
    tagline: "A windowless room gets a patch of sky that follows the real time of day.",
    nodes: ["Clock", "Schedule Trigger", "Sunrise", "Color Temperature"],
    result: "A diffused LED panel in the ceiling of a bathroom, hallway or basement brightens through a sunrise at 6:00, gives cool daylight around midday and warmer light in the morning and afternoon, glows through a sunset in the evening and goes dark overnight. It is circadian lighting you do not have to think about.",
    howItWorks: [
      "A DS3231 clock module keeps the real time. Three Schedule Trigger windows split the day: dawn from 06:00 to 07:00, day until 19:30 and dusk until 20:30. Each reports how far through it is.",
      "At dawn a Sunrise node, driven by that progress, ramps from night blue to warm white. At dusk a second Sunrise runs the same ramp backwards.",
      "Through the day, three Math nodes turn the day's progress into the sun's height: 0 at each end, 1 at the middle. Map Range turns that into a colour temperature from 3000 K to 6500 K, and Color Temperature turns that into the white the panel shows. Outside all three windows the panel is off.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "A 10×10 LED grid: ten 10-LED rows of WS2812B strip at 30 LEDs per metre, wired serpentine on a backing board (100 LEDs)",
      "A DS3231 real-time clock module with a CR2032 coin cell",
      "A 5 V 8 A power supply",
      "Opal acrylic or a frosted diffuser about 8 cm in front of the LEDs, so it reads as one glowing panel",
      "A 330 Ω resistor for the data line and a 1000 µF capacitor across the LED power",
    ],
    tips: [
      "Match the windows to sunrise and sunset where you live, or shift them in winter for a gentler wake-up.",
      "Use high-CRI or RGBW (SK6812-RGBW) strip if the room is used for make-up or colour work.",
    ],
  },
  {
    slug: "garage-parking-aid",
    title: "Garage parking aid",
    category: "home",
    tagline: "A light bar fills from green to red as you drive in, then flashes and beeps at the stop point.",
    nodes: ["Distance Sensor", "Gauge", "Custom Palette", "Buzzer"],
    result: "A metre of LED strip on the garage's back wall shows how close the car is. The bar grows and shifts from green through yellow and orange to red as you creep forward. At the exact stop point the whole strip flashes red and a buzzer beeps, then everything goes dark once you are parked so it is not lit all night.",
    howItWorks: [
      "An HC-SR04 ultrasonic sensor measures the distance to the car in millimetres. Map Range turns 2.5 m away into an empty bar and 45 cm into a full one.",
      "A Gauge draws the bar along the strip, coloured from a Custom Palette of green, yellow, orange and red, so the colour tells you how close you are as well as the length.",
      "Below 45 cm a Compare marks the stop point. An Envelope remembers that you have just arrived: for about five seconds the strip flashes red and the buzzer beeps in time with a square Wave. After that the output switches off until the car moves again.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "An HC-SR04 ultrasonic distance sensor",
      "1 m of WS2812B LED strip at 60 LEDs per metre (60 LEDs)",
      "An active buzzer module",
      "A 5 V 5 A power supply",
      "A 330 Ω resistor for the data line, and a small enclosure for the sensor at bumper height",
    ],
    tips: [
      "Park where you want to stop, read the distance on the Distance Sensor node, and type it into 'At the stop point'.",
      "For a car with a sloping nose, aim the sensor at the bumper or number plate rather than the bonnet.",
    ],
  },
  {
    slug: "directional-stair-lights",
    title: "Directional stair lights",
    category: "home",
    tagline: "Light runs up the stairs ahead of you going up, and down ahead of you going down.",
    nodes: ["Motion Sensor", "Trigger", "Color Wipe", "Smooth"],
    result: "An LED strip along the staircase fades up when someone steps on, with warm colour sweeping in the direction they are walking. Start at the bottom and it runs upward; start at the top and it runs down. It fades out again once the stairs are clear.",
    howItWorks: [
      "One PIR motion sensor sits at the bottom of the stairs and one at the top. A Trigger set to Toggle remembers which one fired last: the bottom sensor sets 'going up', the top sensor clears it.",
      "Two Color Wipe patterns run all the time, one forward and one in reverse. A Frame Switch shows whichever matches the walker's direction.",
      "While either sensor sees someone, Smooth eases the brightness up; when both go quiet it fades it back down over a couple of seconds, so the stairs never snap to black.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "2 HC-SR501 PIR motion sensors",
      "4 m of WS2812B LED strip at 30 LEDs per metre (120 LEDs), with LED 0 at the bottom step",
      "A 5 V 10 A power supply, with power injected at both ends of the strip",
      "A 330 Ω resistor for the data line and a 1000 µF capacitor across the LED power",
      "Aluminium channel with a diffuser to run along the stringer or under the handrail",
    ],
    tips: [
      "Each PIR has a TIME pot that sets how long it stays on after the last movement; turn it to about 20 seconds for a normal staircase.",
      "Swap emberglow for a cooler palette in summer, or drop the brightness for a night-time path light.",
    ],
  },
  {
    slug: "ok-to-wake-clock",
    title: "Kids' OK-to-wake clock",
    category: "home",
    tagline: "Red means stay in bed, green means it is morning. Plus a two-minute toothbrush timer.",
    nodes: ["Clock", "Schedule Trigger", "Clock Display", "Gauge"],
    result: "A soft night-light ring by a child's bed glows dim red all night and turns green at 7:00, so even a child who cannot read a clock knows whether it is time to get up. At bedtime and in the morning, a press of the button turns it into a two-minute toothbrush timer: a ring of light that runs down as they brush.",
    howItWorks: [
      "A DS3231 clock module keeps the time. One Schedule Trigger marks daytime, 07:00 to 19:00; outside it is stay-in-bed time, shown as red at a quarter brightness so it does not keep anyone awake.",
      "A second Schedule Trigger marks the OK-to-wake window, 07:00 to 08:30, which switches the ring to bright green. After that the light switches itself off for the day.",
      "The toothbrush button restarts a Clock Display set to a two-minute Timer. Its seconds remaining, divided by 120, drive a ring Gauge that shrinks as the time runs out. A Trigger holds brushing mode on until the timer reports done.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "A 24-LED WS2812B ring",
      "A DS3231 real-time clock module with a CR2032 coin cell",
      "A large arcade or tactile push button",
      "A 5 V 2 A USB power supply",
      "A frosted dome or printed shade, such as a cloud or moon shape",
    ],
    tips: [
      "Move the wake time later at weekends with the Schedule Trigger's day setting, or with a second pair of triggers set to Weekends.",
      "Change the Timer's duration and the Math divider together for a different countdown, such as a five-minute tidy-up.",
    ],
  },
  {
    slug: "noise-traffic-light",
    title: "Noise traffic light",
    category: "home",
    tagline: "A green, amber and red lamp that tells a classroom or workshop how loud it is getting.",
    nodes: ["Microphone", "Audio Features", "Smooth", "Frame Switch"],
    result: "A ring of LEDs in a frosted lamp glows green while the room is calm, turns amber as the noise builds and red when it is too loud. It reacts to the room's overall level, not to a single shout or a dropped tool, so it reads as fair.",
    howItWorks: [
      "An I2S microphone feeds Audio Features, which reports the room's overall loudness from 0 to 1.",
      "Smooth averages that loudness over a second or two and lets it fall even more slowly. That is the trick that stops the light flickering every time someone laughs.",
      "Two Compare nodes set the amber and red thresholds, each with a little hysteresis so the colour does not chatter at the boundary. Two Frame Switches pick green, amber or red.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "An INMP441 I2S microphone module",
      "A 24-LED WS2812B ring",
      "A 5 V 2 A power supply",
      "A frosted lamp shade, jar or 3D-printed diffuser",
    ],
    tips: [
      "Run it for a normal lesson or work session, watch where the smoothed level sits, then set 'Getting loud' and 'Too loud' just above that.",
      "Add a Buzzer on the red output for a workshop where people wear ear defenders.",
    ],
  },

  // ── Tilt, touch and motion ────────────────────────────────────────────────
  {
    slug: "digital-hourglass",
    title: "Digital hourglass",
    category: "motion",
    tagline: "Flip the frame and LED sand pours to the other end. It is also a kitchen timer.",
    nodes: ["Accel & Gyro", "Particles", "Clock Display", "Gauge", "Zones"],
    result: "A tall, narrow LED panel in a frame that behaves like an hourglass. Turn it over and the golden sand sits in the top bulb, a stream of grains falls through the neck, and the bottom pile grows. After five minutes the top is empty and it beeps. Flip it again to start over.",
    howItWorks: [
      "An MPU-6050 motion sensor reads gravity on each axis in g. Whether the Y axis reads up or down says which way up the frame is, and a Trigger set to Changed spots the moment it flips.",
      "Each flip restarts a Clock Display running a five-minute Timer. The seconds left, divided by 300, set the top bulb's Gauge; one minus that sets the bottom bulb's. Particles in Drops mode make the falling grains, shown only while the timer runs.",
      "Zones places the two bulbs and the neck on the panel, and Frame Transform turns the whole picture 180° when the frame is upside down, so the sand always falls towards the floor. When time is up, an Envelope sounds the buzzer for three seconds.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "An 8×16 WS2812B LED matrix (128 LEDs), or two 8×8 panels joined end to end",
      "An MPU-6050 (GY-521) accelerometer and gyro module",
      "An active buzzer module",
      "A 5 V 10 A power supply (the firmware dims the LEDs to stay within it)",
      "A deep picture frame with a diffuser over the LEDs",
    ],
    tips: [
      "Change the Timer to 180 seconds and the 'Sand left' divider to 180 for a three-minute egg timer.",
      "Swap the honeycomb palette for ocean to make it a water clock.",
    ],
  },
  {
    slug: "fluid-table",
    title: "Fluid coffee table",
    category: "motion",
    tagline: "Touch the glass and ink blooms and swirls through the table under your fingers.",
    nodes: ["Touch Pad", "Math", "Fluid", "Field → Frame"],
    result: "A coffee table with an LED grid under smoked glass. Twelve hidden touch pads sit just under the top; touch the glass above one and a cloud of colour pours into a live fluid simulation at that spot, then drifts, curls and slowly fades away.",
    howItWorks: [
      "An MPR121 board reads twelve copper-tape pads laid out in four columns and three rows. It reports which pad is touched, numbered 0 to 11 along each row.",
      "Math turns the pad number into its column (number modulo 4) and row (what is left, divided by 4), and two Map Range nodes turn those into a position across and down the table.",
      "While a pad is touched, Fluid injects dye at that position. Fluid simulates the flow that carries it, and Field → Frame colours the dye through the deep-sea palette onto the LED grid.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "An Adafruit MPR121 12-key capacitive touch board",
      "Copper tape for twelve pads of about 6 × 6 cm, with thin wire back to the MPR121",
      "A 16×10 grid of WS2812B LEDs: ten 16-LED rows of strip at 30 LEDs per metre, wired serpentine (160 LEDs)",
      "A 5 V 10 A power supply, with power injected at both ends of the grid",
      "A smoked or frosted glass top no more than 6 mm thick, so the pads can sense through it",
    ],
    tips: [
      "Keep the pad wires short and away from the LED power lines; raise the Touch Pad's threshold if pads trigger on their own.",
      "Change the palette on Field → Frame, or raise Fluid's dissipation so each touch fades sooner.",
    ],
  },
  {
    slug: "blow-out-candles",
    title: "Blow-out candles",
    category: "motion",
    tagline: "LED candle lanterns you can blow out, which slowly relight themselves.",
    nodes: ["Candle", "Microphone", "Frequency Band", "Envelope", "Smooth"],
    result: "Three lanterns with flickering LED flames. Blow towards them and the flames go out at once; a few seconds later they creep back to life one flicker at a time. It is a party trick, a birthday cake that never runs out, and a safe candle for a child's room.",
    howItWorks: [
      "Candle in per-pixel mode gives every LED its own warm, independent flicker, so each lantern looks alive.",
      "Blowing on a microphone makes a loud, low rumble. A Frequency Band listens to 90–400 Hz with extra gain, and a Compare decides when that is a real puff.",
      "A puff starts an Envelope that holds the flames out for about four seconds. One minus the envelope is the flame level, and Smooth lets it drop at once but rise slowly, so the candles snuff instantly and relight gently.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "An INMP441 I2S microphone module, mounted near the lanterns",
      "21 WS2812B LEDs: three 7-LED jewels or short strips, one per lantern, chained on one data line",
      "A 5 V 2 A power supply",
      "Three small lanterns or jars with frosted or paper diffusers",
    ],
    tips: [
      "If talking or music blows them out, raise the threshold on 'A puff'; if a good blow does nothing, lower it or move the microphone closer.",
      "Lower Candle's warmth for a whiter flame, or raise Flicker for a draughty room.",
    ],
  },
  {
    slug: "cube-lamp",
    title: "Cube lamp",
    category: "motion",
    tagline: "Turn the cube to choose the pattern; shake it for a new palette.",
    nodes: ["Accel & Gyro", "Compare", "Frame Switch", "Palette Bank"],
    result: "A frosted cube lamp with no buttons at all. Whichever face is on top picks one of six moods: ocean waves, fire, plasma, twinkling stars, juggling dots or a slow breath. Give it a shake and every pattern moves on to the next palette.",
    howItWorks: [
      "An MPU-6050 inside the cube measures gravity along X, Y and Z in g. When one axis reads more than 0.7 g up or down, that face is on top. Five Compare nodes with hysteresis turn those readings into five yes-or-no answers; the sixth face is what is left.",
      "Six patterns run side by side, and a chain of five Frame Switches picks the one that matches the face that is up.",
      "The sensor's Shake output measures how far the total force strays from 1 g. A firm shake steps a Palette Bank to its next palette, and the bank feeds all six patterns, so the whole lamp changes colour together.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "An 8×8 WS2812B LED matrix panel (64 LEDs)",
      "An MPU-6050 (GY-521) accelerometer and gyro module, mounted flat with Z pointing up",
      "A 5 V 5 A USB-C power supply",
      "A frosted acrylic or 3D-printed cube, about 12 cm on each side",
    ],
    tips: [
      "Swap any of the six patterns for your favourite from the Pattern Library: wire its frame into the same Frame Switch input.",
      "Edit the Palette Bank's list to choose which palettes a shake steps through.",
    ],
  },
  {
    slug: "bike-brake-light",
    title: "Bike or skateboard brake light",
    category: "motion",
    tagline: "A rear light that flares red when you slow down, with indicator buttons and a sized battery.",
    nodes: ["Accel & Gyro", "Smooth", "Zones", "Battery Pack"],
    result: "A compact rear light for a bike, skateboard or scooter. It shows a steady red tail light, flares to full brightness whenever you brake, and holds it for a moment after you stop. Two handlebar buttons flash amber indicators on the left or right end, and it runs from rechargeable 18650 cells.",
    howItWorks: [
      "An MPU-6050, mounted with its X axis pointing forward, feels the slowdown when you brake. Smooth takes the jitter out of a bumpy road, and a Compare treats slowing harder than 0.25 g as braking.",
      "An Envelope holds the brake light for a second after the braking stops. A Switch sets the red tail to 25% normally and 100% while braking.",
      "Each button toggles its indicator. While one is on, a square Wave flashes that end of the strip amber, routed there by Zones. The Battery Pack node describes two 18650 cells in parallel, so the Build Diagram can size the fuse and work out the runtime.",
    ],
    needs: [
      "A Seeed Studio XIAO ESP32S3 board",
      "12 WS2812B LEDs: a short strip or a 12-LED stick",
      "An MPU-6050 (GY-521) accelerometer and gyro module",
      "2 waterproof momentary push buttons for the handlebar",
      "2 Samsung INR18650-35E cells in a 1S2P holder",
      "A TP4056 USB-C charge and protection module and a TPS61023 5 V boost module",
      "A weatherproof enclosure with a red diffuser",
    ],
    tips: [
      "If braking does not trigger it, check the sensor's X axis points forward; if it triggers on bumps, raise the 0.25 g threshold a little.",
      "Open the Build Diagram's battery plan to see the runtime and fuse for your cells.",
    ],
    caution: "This is a supplement to, not a replacement for, the lights your local road rules require. Lithium cells need a protection board, and should only be charged at room temperature.",
  },

  // ── Music and learning ────────────────────────────────────────────────────
  {
    slug: "piano-teacher-strip",
    title: "Piano teacher strip",
    category: "music",
    tagline: "A strip over the keys shows the next note in blue and lights each key you play in green.",
    nodes: ["MIDI", "Line", "Crossfade Cycle", "Blend"],
    result: "An LED strip laid along the back of a keyboard, two LEDs above each key of the octave from middle C. A short lesson plays itself in blue, one note at a time, showing you which key comes next. Every key you press lights green above it, so you can see at once whether you hit the right one.",
    howItWorks: [
      "The keyboard's MIDI out runs to a MIDI interface on the board. A MIDI node watches one note, so there are twelve of them, C4 to B4, each with its gate going true while the key is held.",
      "Each key has a Line covering its two LEDs. Math multiplies the key's gate by 255 for the Line's green channel, so the line is green while the key is down and black otherwise. The twelve lines are chained, each drawn on top of the last.",
      "The lesson is four blue Lines in a Crossfade Cycle: C, E, G, E, a note every two seconds. Blend in Lighten mode lays your playing over the lesson.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "A MIDI input interface for 5-pin DIN (with an H11L1 opto-isolator), and a MIDI cable",
      "A keyboard or digital piano with MIDI out",
      "24 WS2812B LEDs on a strip at 144 LEDs per metre, cut to span one octave",
      "A 5 V 2 A USB power supply",
      "Double-sided tape or a slim aluminium channel to sit the strip behind the keys",
    ],
    tips: [
      "Move the four lesson Lines to teach a different phrase; each Line's X sets which key it marks.",
      "Copy the twelve key nodes and change their notes to cover a second octave on a longer strip.",
    ],
  },
  {
    slug: "instrument-tuner",
    title: "Singing and instrument tuner",
    category: "music",
    tagline: "A light bar that centres and turns green when you are in tune, and drifts left or right when flat or sharp.",
    nodes: ["Microphone", "Pitch Detect", "Step Value", "Gauge"],
    result: "A strip of LEDs on a music stand or the wall of a practice room. Play or sing a note and a single dot of light shows how close you are: dead centre and green when in tune, sliding left and turning red when flat, right when sharp. A button steps through the six guitar strings, and the end of the strip shows which one you are tuning.",
    howItWorks: [
      "An I2S microphone feeds Pitch Detect, which reports the frequency you are playing in Hz and how confident it is that it hears a clear note.",
      "A button steps a Step Value through strings 0 to 5. Five Compare nodes and five Switches turn that into the target pitch: E2 82.41 Hz, A2 110, D3 146.83, G3 196, B3 246.94 and E4 329.63 Hz.",
      "Math divides the pitch you play by the target. Map Range turns 50 cents flat to 50 cents sharp into 0 to 1 for a dot Gauge, coloured by a red-green-green-red palette. The dot fades out when no clear note is heard.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "An INMP441 I2S microphone module",
      "37 WS2812B LEDs on a strip at 60 LEDs per metre",
      "A push button",
      "A 5 V 3 A USB power supply",
    ],
    tips: [
      "For a ukulele, violin or a singer's warm-up notes, type new frequencies into the five Switch nodes.",
      "Put the microphone close to the instrument's sound hole in a noisy room.",
    ],
  },
  {
    slug: "breathing-coach",
    title: "Breathing coach",
    category: "music",
    tagline: "A light that paces 4-7-8 breathing, warming from daylight to candlelight as the session goes on.",
    nodes: ["Clock Display", "Math", "Color Temperature", "Breathe"],
    result: "A glowing ring on a bedside table. Press the button and it guides four rounds of 4-7-8 breathing: it brightens for four seconds while you breathe in, holds bright for seven, and fades over eight while you breathe out. The light starts cool and warms with every breath, then settles into a slow, gentle Breathe to drift off to.",
    howItWorks: [
      "The button restarts a Clock Display running as a stopwatch. Math takes the seconds modulo 19 to find where you are in the current breath.",
      "Breathing in is that time divided by 4; breathing out is one minus the time past 11 seconds, divided by 8. The smaller of the two, clamped to 0 to 1, is exactly the 4-7-8 shape: rise, hold, fall.",
      "Map Range turns the session time into a colour temperature, from 6500 K down to a candle-like 2200 K after 76 seconds. When the four breaths are done, a Frame Switch hands over to a Breathe node at six breaths a minute.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "A 24-LED WS2812B ring",
      "A push button",
      "A 5 V 2 A USB power supply",
      "A frosted globe or paper lantern",
    ],
    tips: [
      "For box breathing (4-4-4-4), change the cycle to 16 seconds, the inhale divider to 4, the hold to end at 8 and the exhale divider to 4.",
      "Lower the Board brightness for use in a dark bedroom.",
    ],
  },
  {
    slug: "stage-fixture",
    title: "Real stage fixture",
    category: "music",
    tagline: "Make a home-built LED matrix a proper fixture on a lighting desk or in xLights.",
    nodes: ["DDP Input", "DMX / Art-Net", "DMX Channel", "Frame Switch"],
    result: "A 16×16 LED matrix that joins a real lighting rig over Wi-Fi. xLights, LedFx or WLED can stream video and effects to it pixel by pixel, while a lighting desk running Art-Net controls its master dimmer and colour like any other fixture. With nothing streaming it shows a calm standby look.",
    howItWorks: [
      "DDP Input listens for pixels sent by xLights, LedFx or WLED. While a stream is live, a Frame Switch shows it; otherwise it shows a slow Plasma.",
      "DMX / Art-Net receives universe 0 from a lighting desk. DMX Channel 1 is the fixture's dimmer and channel 2 shifts its hue.",
      "A Switch only hands the dimmer to the desk while Art-Net is live, so the matrix is not left dark when no desk is connected.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "A 16×16 WS2812B LED matrix panel (256 LEDs)",
      "A 5 V 20 A power supply, with power injected at two or more points",
      "A 330 Ω resistor for the data line and a 1000 µF capacitor across the LED power",
      "Your Wi-Fi network details, entered on the Board in the app before uploading",
      "Lighting software that speaks DDP (xLights, LedFx, WLED) or a desk that sends Art-Net",
    ],
    tips: [
      "In xLights, add the matrix as a DDP controller at the board's IP address with 256 pixels.",
      "Patch it on the desk as a two-channel fixture: dimmer, then hue.",
    ],
  },

  // ── Environment and machines ──────────────────────────────────────────────
  {
    slug: "thunderstorm-vivarium",
    title: "Thunderstorm vivarium",
    category: "environment",
    tagline: "A tank light with a daily cycle and an afternoon storm: lightning, thunder and rain from the mister.",
    nodes: ["Schedule Trigger", "Lightning", "DFPlayer Mini", "Relay Module", "Sunrise", "Pacifica"],
    result: "The lid of a vivarium or paludarium gets a full day: a sunrise at 7:00, steady daylight, a sunset at 19:00 and soft, rippling blue moonlight overnight. Every afternoon at 15:00 the sky darkens for a fifteen-minute storm, with lightning flashes, rolling thunder from a small speaker and the mister switched on for rain.",
    howItWorks: [
      "A DS3231 clock module keeps the time. Schedule Triggers mark dawn, day, dusk and the storm. Two Sunrise nodes driven by the dawn and dusk progress ramp the light up and down.",
      "Pacifica in a deep-sea palette, dimmed to 15%, is the moonlight. In daytime a 6000 K white shows; during the storm that daylight drops to 20% and Lightning flashes over it.",
      "When the storm window opens, the DFPlayer Mini starts track 1, a thunder recording, and stops when it closes. The same signal switches a relay that runs the mister or rain pump.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "1 m of WS2812B LED strip at 60 LEDs per metre (60 LEDs), in a waterproof (IP65) sleeve",
      "A DS3231 real-time clock module with a CR2032 coin cell",
      "A DFPlayer Mini, a microSD card with a thunder recording saved as 0001.mp3, and a small 3 W speaker",
      "A 1-channel 5 V relay module for the mister or pump",
      "A 5 V 5 A power supply",
    ],
    tips: [
      "Match the windows to your animals' natural day length, and keep the storm short and occasional for nervous species.",
      "Add more Schedule Triggers for a second storm, or use the Weekdays setting to vary the week.",
    ],
    caution: "Keep electronics and mains-powered misters well away from water, and follow your animals' care requirements for UVB and heat; this is decorative lighting only.",
  },
  {
    slug: "power-orb",
    title: "Power orb",
    category: "environment",
    tagline: "A glowing orb that shows a solar or van battery charging, idle or draining, and how hard.",
    nodes: ["Power Monitor", "Compare", "Wave", "Frame Switch"],
    result: "A frosted orb on the shelf of a camper van or shed glows green while the solar panel is charging the battery, amber when nothing much is flowing, and red when the battery is being drained. It breathes faster the more current is flowing, so you can tell a trickle from a kettle at a glance.",
    howItWorks: [
      "An INA219 power monitor sits in the battery's negative or positive lead and measures volts, amps and watts. With the shunt wired so current drawn from the battery reads positive, charging reads negative.",
      "Two Compare nodes, with a small dead band and hysteresis, decide charging, idle or draining, and two Frame Switches pick green, amber or red.",
      "The size of the current, whichever way it flows, comes from Math max(amps, −amps). Map Range turns 0–3 A into 20–150 beats per minute for a sine Wave, and the wave dims the colour between 35% and 100%: a slow breath at idle, a fast pulse under load.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "An INA219 current sensor module (reads up to 26 V and about 3.2 A with its stock shunt)",
      "A 16-LED WS2812B ring",
      "A 12 V to 5 V buck converter rated 2 A, to power everything from the battery",
      "An inline fuse for the battery connection",
      "A frosted glass or printed orb as a diffuser",
    ],
    tips: [
      "For bigger systems, fit a lower-value shunt resistor to the INA219, or measure one branch circuit, and change the 0–3 A range on Map Range to match.",
      "Add an OLED display and wire the Power Monitor's Display output to it to read the exact volts and watts.",
    ],
    caution: "Batteries can deliver very large currents. Fuse the connection close to the battery and keep the INA219 within its voltage and current ratings.",
  },
  {
    slug: "enclosure-guardian",
    title: "Enclosure guardian",
    category: "environment",
    tagline: "A 3D-printer or server cupboard that shows its heat, runs its own fan and sounds an alarm when it is too hot.",
    nodes: ["Temperature Probe", "Heat Color", "Cooling Fan", "Buzzer"],
    result: "An LED strip inside a printer enclosure or a cupboard full of network gear glows from black through deep red and orange to yellow as it warms. A PWM fan speeds up from 30 °C, and above 55 °C, or if the probe comes loose, the strip flashes red and a buzzer sounds.",
    howItWorks: [
      "A waterproof DS18B20 probe reads the air temperature. Map Range turns 25–60 °C into 0–1, and Heat Color turns that into the familiar black-red-orange-yellow heat scale for the whole strip.",
      "A second Map Range is the fan curve: 20% speed at 30 °C rising to full speed at 45 °C. The four-wire fan's tachometer reports its real RPM back to the node.",
      "A Compare with 2 °C of hysteresis marks over-temperature. Either that or a disconnected probe raises the alarm: red flashes on the strip and the buzzer beeps in time with a square Wave.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "A waterproof DS18B20 temperature probe and a 4.7 kΩ pull-up resistor",
      "A 4-wire 5 V PWM fan (such as a Noctua NF-A4x10 5V PWM)",
      "0.5 m of WS2812B LED strip at 60 LEDs per metre (30 LEDs)",
      "An active buzzer module",
      "A 5 V 3 A power supply",
    ],
    tips: [
      "Mount the probe in the air near the top of the enclosure, not touching the printer's hot end or bed.",
      "For a resin printer, lower the thresholds: most resins want 20–30 °C.",
    ],
    caution: "This is an indicator only. It is not a safety cut-out: it never removes power from the printer or equipment. Use a proper thermal fuse or smoke-detecting power cut-off for that.",
  },
  {
    slug: "brew-monitor",
    title: "Fermentation and brew monitor",
    category: "environment",
    tagline: "A glance at the colour tells you if the ferment is in range; it beeps when it is not.",
    nodes: ["Temperature Probe", "Custom Palette", "Palette Sampler", "Compare"],
    result: "A small LED ring on the fermenter glows blue when the brew is too cold, green while it sits in the yeast's happy range, and red when it runs warm. Step outside 17–23 °C and it flashes and beeps until you fix it.",
    howItWorks: [
      "A waterproof DS18B20 probe in a thermowell, or taped to the fermenter under insulation, reads the brew's temperature.",
      "Map Range turns 14–26 °C into 0–1, and a Palette Sampler picks the colour from a Custom Palette of blue, green, green and red, so the middle of the scale is a wide green band.",
      "Two Compare nodes, with a little hysteresis, catch too cold and too warm. Either one, or a disconnected probe, dims the ring on the off-beat of a slow square Wave and sounds the buzzer.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "A waterproof DS18B20 temperature probe and a 4.7 kΩ pull-up resistor",
      "A 12-LED WS2812B ring",
      "An active buzzer module",
      "A 5 V 1 A USB power supply",
      "A thermowell, or tape and insulation to hold the probe against the fermenter",
    ],
    tips: [
      "Lager yeast wants roughly 9–14 °C: change both Compare thresholds and the Map Range together.",
      "Use the same build for sourdough proving, yoghurt or kombucha with their own ranges.",
    ],
  },

  // ── Games and props ───────────────────────────────────────────────────────
  {
    slug: "escape-room-prop",
    title: "Escape-room keypad lock",
    category: "games",
    tagline: "Enter the right code and the maglock releases, with a light and sound fanfare.",
    nodes: ["Keypad", "Trigger", "Relay Module", "DFPlayer Mini", "Gauge"],
    result: "A keypad on an escape-room door or puzzle box. Each correct digit lights another quarter of a ring of LEDs; get all four right and a relay releases the magnetic lock, confetti bursts across the ring and a fanfare plays. Pressing * resets it for the next team.",
    howItWorks: [
      "The code is 2 5 8 0. Each digit is a Trigger that turns on when its key is pressed and the digit before it is already on, so the digits only count in order. The * key turns every digit off again.",
      "Math adds up the digits that are on, and a four-segment ring Gauge shows that as progress.",
      "When the last digit turns on, the relay energises to release the lock, a Frame Switch shows Confetti, and the DFPlayer plays track 1. Every key press clicks the buzzer.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "A 4×4 membrane matrix keypad",
      "A 16-LED WS2812B ring",
      "A 1-channel 5 V relay module and a 12 V maglock with its own 12 V supply",
      "A DFPlayer Mini, a microSD card with a fanfare saved as 0001.mp3, and a small speaker",
      "An active buzzer module",
      "A 5 V 2 A power supply for the board and LEDs",
    ],
    tips: [
      "To change the code, rewire the four key inputs: key0 to key15 run 1 2 3 A, 4 5 6 B, 7 8 9 C, * 0 # D.",
      "Wire the maglock through the relay so cutting power releases the door, and give players a visible manual release.",
    ],
    caution: "Never use a lock that can trap people. Escape rooms need a fail-safe release that works without power and an emergency exit players can always use.",
  },
  {
    slug: "tabletop-scene-box",
    title: "Tabletop scene box",
    category: "games",
    tagline: "Keypad buttons set the scene—tavern fire, storm or dungeon—and the table edge shows whose turn it is.",
    nodes: ["Keypad", "Fire", "Lightning", "Noise", "Step Value", "Zones"],
    result: "An LED strip round the edge of a gaming table, controlled by a small keypad at the game master's seat. A sets a warm tavern firelight, B a rainy storm with lightning, C a dim, green dungeon. D passes the turn: the stretch of table in front of the next player gets a slow, pale spotlight.",
    howItWorks: [
      "The keypad's A, B and C keys each latch a scene with a Trigger, and pressing one releases the others. The tavern scene is on at power-up. Two Frame Switches choose Fire, Pacifica with Lightning, or a dim Noise field.",
      "The D key steps a Step Value from 0 to 3 and wraps back round. Three Compare nodes and some Logic turn that number into one true value per seat.",
      "Zones splits the strip into four quarters, one per seat. Each quarter shows the scene, or the scene lit up by a Breathe spotlight when it is that player's turn.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "A 4×4 membrane matrix keypad",
      "4 m of WS2812B LED strip at 30 LEDs per metre (120 LEDs), one metre per side of the table",
      "A 5 V 10 A power supply, with power injected at both ends of the strip",
      "Aluminium channel with a diffuser to fit under the table edge",
    ],
    tips: [
      "Turn the scene patterns into your campaign's own: a forest, a ship's deck, a boss fight.",
      "For more than four players, chain a second Zones node and widen the Step Value's range.",
    ],
  },
  {
    slug: "reaction-game",
    title: "Reaction game",
    category: "games",
    tagline: "One of four pads lights up; hit it before it moves. Score on the display, buzzer on a miss.",
    nodes: ["Random", "Button", "Step Value", "Text", "Buzzer"],
    result: "Four big arcade buttons, each with a coloured light above it, and a score display. One light at a time comes on and jumps somewhere new every 1.2 seconds. Hit the lit button to score; hit a wrong one and the buzzer sounds and your score drops back to zero.",
    howItWorks: [
      "An Interval fires every 1.2 seconds, and each pulse makes Random pick a new number from 0 to 4. Three Compare nodes and two XOR Logic nodes turn it into exactly one lit pad.",
      "Each button is ANDed with its pad being lit to count a hit. Any press that is not a hit is a miss.",
      "A hit steps the score up with Step Value and a miss resets it. Format Number and Text draw the score on a small LED matrix, and an Envelope gives the buzzer a short beep on a miss. Zones lights the pads, a quarter of the strip each.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "4 large arcade push buttons",
      "32 WS2812B LEDs on strip, 8 above each button",
      "A 16×8 WS2812B LED matrix for the score (128 LEDs)",
      "An active buzzer module",
      "A 5 V 10 A power supply (the firmware dims the LEDs to stay within it)",
    ],
    tips: [
      "Shorten the Interval to make it harder, or add a second game mode with a Frame Switch.",
      "The 7-segment display node shows clock, track and power readings rather than a free number, so the score lives on the LED matrix.",
    ],
  },
  {
    slug: "diorama-town",
    title: "Diorama and model railway town",
    category: "games",
    tagline: "One strip lights a whole street: a TV in one window, a candle in another, a welder at work in the shed.",
    nodes: ["Zones", "TV Simulator", "Candle", "Lightning", "Fire"],
    result: "A single LED strip snakes under a model street. Most of it gives warm, dim street lighting, while each building gets its own life: a flickering television in a house, a candle in a cottage, the blue-white crackle of an arc welder in the workshop, and an open fire in the pub.",
    howItWorks: [
      "Zones routes up to four patterns into their own stretch of one output, with a base pattern everywhere else. Here the base is a 2700 K street-lamp white, dimmed to 35%.",
      "Zone A is TV Simulator, B is a per-pixel Candle, C is Lightning tuned fast and blue-white so it reads as welding flashes, and D is Fire for the pub's hearth.",
      "Each zone has an X and a width as a fraction of the strip, so you match them to where the strip passes through each building.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "40 LEDs of WS2812B strip, or individual WS2812B pixels on wire for building interiors",
      "A 5 V 3 A power supply",
      "Thin wire and heat-shrink to link pixels between buildings",
      "Black tape or paint to stop light leaking between buildings",
    ],
    tips: [
      "A second Zones node on the first one's output gives you four more buildings.",
      "Put the welder behind frosted plastic so the flash spills out of the doorway rather than showing the LED.",
    ],
  },
  {
    slug: "prop-sword",
    title: "Prop sword",
    category: "games",
    tagline: "A glowing blade that brightens and hums louder as you swing it, and flashes and clashes on impact.",
    nodes: ["Accel & Gyro", "Function", "Beat Flash", "DFPlayer Mini"],
    result: "A cosplay sword or staff with an LED blade. Hold it still and it glows and hums softly; swing it and the blade brightens and the hum swells. Strike something and the whole blade flashes white with a clash sound.",
    howItWorks: [
      "An MPU-6050 in the hilt measures how fast the sword turns on each axis, in degrees per second. Function takes the size of each, and Math max picks the fastest axis.",
      "Map Range and Smooth turn that into a swing amount from 0 to 1, which sets the blade's brightness and the DFPlayer's volume.",
      "A hit shows up as a spike in the sensor's Shake reading. It fires a Beat Flash over the blade and an Envelope that switches the DFPlayer from track 1, a long hum, to track 2, the clash, for a moment.",
    ],
    needs: [
      "A Seeed Studio XIAO ESP32S3 board",
      "1 m of WS2812B LED strip at 60 LEDs per metre, in a polycarbonate blade tube",
      "An MPU-6050 (GY-521) accelerometer and gyro module",
      "A DFPlayer Mini, a microSD card with a hum as 0001.mp3 and a clash as 0002.mp3, and a small 3 W speaker",
      "A 5 V 3 A USB power bank that fits in the hilt (the firmware caps the LEDs at 2.4 A)",
    ],
    tips: [
      "Change the Solid Color for a different blade, or swap it for Fire for a flaming sword.",
      "Raise the Impact threshold if ordinary swings trigger the clash.",
    ],
    caution: "Keep props light and blunt, and follow your event's weapon-prop rules.",
  },
  {
    slug: "christmas-house-show",
    title: "Christmas house show",
    category: "games",
    tagline: "A music-synced light show from an SD card, with relays switching plug-in decorations on the beat.",
    nodes: ["Music Player", "Pattern Collection", "Beat Detect", "Relay Module"],
    result: "The front of the house becomes a show. An LED strip along the roofline plays patterns that answer the music, played from MP3s on an SD card through a speaker. Four relays switch plug-in decorations—an inflatable, a lit reindeer, a wreath, a star—on and off with the beat.",
    howItWorks: [
      "The Music Player plays the MP3s on the SD card through an I2S amplifier, and chooses and switches patterns from its Pattern Collection to suit the music. The collection opens with eight audio-reactive patterns made for a line of lights.",
      "Beat Detect listens to the same music. Relay 1 flips on every beat and relay 2 does the opposite, so two decorations swap back and forth; a pulse divider makes relay 3 flip every second beat.",
      "Relay 4 stays on whenever music is playing, for decorations that should simply light during the show.",
    ],
    needs: [
      "An ESP32-S3 DevKitC-1 board",
      "5 m of WS2812B LED strip at 30 LEDs per metre (150 LEDs), outdoor rated",
      "A microSD card module and a card with your MP3s",
      "A MAX98357A I2S amplifier and an outdoor speaker",
      "A 4-channel 5 V relay module, or a solid-state relay board, in a weatherproof box",
      "A 5 V 10 A power supply, with power injected at both ends of the strip",
    ],
    tips: [
      "Add, remove and reorder patterns in the Pattern Collection to make the show your own.",
      "Mechanical relays wear out clicking on every beat; solid-state relays suit fast switching better.",
    ],
    caution: "Switching mains decorations is dangerous. Use relays rated for mains, an enclosed and earthed weatherproof box, and an RCD-protected outdoor circuit, or have an electrician wire it.",
  },
];

export function findProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

export function projectsIn(category: ProjectCategoryId): Project[] {
  return projects.filter((project) => project.category === category);
}

export function projectCategory(id: ProjectCategoryId): ProjectCategory {
  return projectCategories.find((category) => category.id === id)!;
}

/** The previous and next project in reading order, across categories. */
export function projectNeighbours(slug: string): { previous?: Project; next?: Project } {
  const ordered = projectCategories.flatMap((category) => projectsIn(category.id));
  const index = ordered.findIndex((project) => project.slug === slug);
  return { previous: ordered[index - 1], next: ordered[index + 1] };
}

/** Where a project's file is served, and the name it downloads as. */
export function projectFile(slug: string): { url: string; fileName: string } {
  const fileName = `${slug}.fastled-project.json`;
  return { url: `/project-files/${fileName}`, fileName };
}

import type { Equipment, Exercise, Level, MuscleId } from '../types';

const STEP: Record<Equipment, number> = {
  barbell: 2.5,
  dumbbell: 2,
  cable: 2.5,
  machine: 5,
  kettlebell: 4,
  bodyweight: 2.5,
};

interface Def {
  id: string;
  name: string;
  eq: Equipment;
  lvl: Level;
  p: MuscleId[];
  s?: MuscleId[];
  sets?: [number, number];
  reps: [number, number];
  steps: string[];
  breath: string;
  mistakes: string[];
  safety?: string;
}

const def = (d: Def): Exercise => ({
  id: d.id,
  name: d.name,
  equipment: d.eq,
  level: d.lvl,
  primary: d.p,
  secondary: d.s ?? [],
  steps: d.steps,
  breathing: d.breath,
  mistakes: d.mistakes,
  safety: d.safety,
  recommended: { sets: d.sets ?? [3, 4], reps: d.reps },
  weightStep: STEP[d.eq],
  custom: false,
});

const PRESS_BREATH = 'Beim Absenken einatmen, beim Drücken ausatmen.';
const PULL_BREATH = 'Beim Ziehen ausatmen, beim kontrollierten Nachlassen einatmen.';
const LEG_BREATH = 'Vor dem Absenken tief einatmen und den Rumpf anspannen, nach der schwersten Stelle ausatmen.';

export const BUILTIN_EXERCISES: Exercise[] = [
  // Brust
  def({
    id: 'bench-press', name: 'Bankdrücken', eq: 'barbell', lvl: 'beginner',
    p: ['chest'], s: ['triceps', 'deltsFront'], reps: [6, 10],
    steps: [
      'Auf die Bank legen, Augen unter der Stange, Füße fest am Boden.',
      'Schulterblätter zusammen und nach unten ziehen, Griff etwas breiter als schulterbreit.',
      'Stange kontrolliert zur unteren Brust absenken, Ellbogen etwa 45 Grad vom Körper.',
      'Stange gerade nach oben drücken, bis die Arme gestreckt sind.',
    ],
    breath: PRESS_BREATH,
    mistakes: ['Stange auf der Brust abfedern lassen', 'Gesäß hebt von der Bank ab', 'Ellbogen zeigen 90 Grad zur Seite'],
    safety: 'Bei schweren Sätzen mit Sicherungspartner oder Sicherheitsablagen trainieren.',
  }),
  def({
    id: 'incline-bench-press', name: 'Schrägbankdrücken', eq: 'barbell', lvl: 'intermediate',
    p: ['chest', 'deltsFront'], s: ['triceps'], reps: [6, 10],
    steps: [
      'Bank auf 30 bis 45 Grad stellen, Schulterblätter zurückziehen.',
      'Stange zur oberen Brust absenken.',
      'Kontrolliert nach oben drücken, ohne das Becken anzuheben.',
    ],
    breath: PRESS_BREATH,
    mistakes: ['Bank zu steil, dadurch reine Schulterübung', 'Hohlkreuz zum Mogeln'],
    safety: 'Sicherheitsablagen auf Brusthöhe einstellen.',
  }),
  def({
    id: 'db-bench-press', name: 'Kurzhantel-Bankdrücken', eq: 'dumbbell', lvl: 'beginner',
    p: ['chest'], s: ['triceps', 'deltsFront'], reps: [8, 12],
    steps: [
      'Mit den Hanteln auf den Oberschenkeln setzen und gemeinsam zurücklegen.',
      'Hanteln seitlich der Brust absenken, Unterarme senkrecht.',
      'Hanteln in leichtem Bogen nach oben drücken.',
    ],
    breath: PRESS_BREATH,
    mistakes: ['Hanteln oben zusammenschlagen', 'Zu tief absenken mit Schmerz in der Schulter'],
  }),
  def({
    id: 'incline-db-press', name: 'Schrägbank-Kurzhanteldrücken', eq: 'dumbbell', lvl: 'beginner',
    p: ['chest', 'deltsFront'], s: ['triceps'], reps: [8, 12],
    steps: [
      'Bank auf 30 Grad stellen, Hanteln auf Schulterhöhe.',
      'Schräg nach oben über die obere Brust drücken.',
      'Langsam zurück in die Ausgangsposition.',
    ],
    breath: PRESS_BREATH,
    mistakes: ['Ellbogen zu weit nach außen', 'Bewegung nicht vollständig'],
  }),
  def({
    id: 'cable-fly', name: 'Kabel-Flys', eq: 'cable', lvl: 'intermediate',
    p: ['chest'], s: ['deltsFront'], reps: [10, 15],
    steps: [
      'Seilzüge auf Schulterhöhe, Schrittstellung in der Mitte.',
      'Arme leicht gebeugt fixieren.',
      'Griffe in einem Bogen vor der Brust zusammenführen.',
      'Kontrolliert öffnen, bis eine Dehnung in der Brust spürbar ist.',
    ],
    breath: 'Beim Zusammenführen ausatmen, beim Öffnen einatmen.',
    mistakes: ['Arme beugen und strecken wie beim Drücken', 'Zu schweres Gewicht mit Schwung'],
  }),
  def({
    id: 'pec-deck', name: 'Butterfly-Maschine', eq: 'machine', lvl: 'beginner',
    p: ['chest'], reps: [10, 15],
    steps: [
      'Sitzhöhe so einstellen, dass die Griffe auf Brusthöhe liegen.',
      'Rücken an das Polster, Schulterblätter zurück.',
      'Griffe vor der Brust zusammenführen und kurz halten.',
      'Langsam zurückführen.',
    ],
    breath: 'Beim Zusammenführen ausatmen.',
    mistakes: ['Schultern rollen nach vorn', 'Gewicht fällt unkontrolliert zurück'],
  }),
  def({
    id: 'push-up', name: 'Liegestütze', eq: 'bodyweight', lvl: 'beginner',
    p: ['chest'], s: ['triceps', 'deltsFront', 'abs'], reps: [8, 20],
    steps: [
      'Hände etwas breiter als schulterbreit, Körper bildet eine Linie.',
      'Brust bis knapp über den Boden absenken.',
      'Kräftig nach oben drücken, Rumpf bleibt fest.',
    ],
    breath: PRESS_BREATH,
    mistakes: ['Hüfte hängt durch', 'Kopf nach vorn gestreckt'],
  }),
  def({
    id: 'dips', name: 'Dips', eq: 'bodyweight', lvl: 'intermediate',
    p: ['chest', 'triceps'], s: ['deltsFront'], reps: [6, 12],
    steps: [
      'Am Barren stützen, Arme gestreckt.',
      'Oberkörper leicht nach vorn neigen und absenken, bis die Oberarme waagerecht sind.',
      'Nach oben drücken.',
    ],
    breath: PRESS_BREATH,
    mistakes: ['Zu tief absenken', 'Schultern ziehen zu den Ohren'],
    safety: 'Bei Schulterbeschwerden Bewegungsumfang verkleinern.',
  }),
  // Rücken
  def({
    id: 'pull-up', name: 'Klimmzüge', eq: 'bodyweight', lvl: 'intermediate',
    p: ['lats'], s: ['biceps', 'deltsRear', 'forearms'], reps: [5, 10],
    steps: [
      'Stange schulterbreit im Obergriff fassen.',
      'Schulterblätter nach unten ziehen, dann den Körper hochziehen, bis das Kinn über der Stange ist.',
      'Kontrolliert ablassen, bis die Arme gestreckt sind.',
    ],
    breath: PULL_BREATH,
    mistakes: ['Schwung aus den Beinen', 'Nur halbe Wiederholungen'],
  }),
  def({
    id: 'lat-pulldown', name: 'Latzug', eq: 'cable', lvl: 'beginner',
    p: ['lats'], s: ['biceps', 'deltsRear'], reps: [8, 12],
    steps: [
      'Knie unter das Polster, Stange breit greifen.',
      'Brust heraus, Stange zur oberen Brust ziehen.',
      'Langsam nach oben führen, bis die Arme gestreckt sind.',
    ],
    breath: PULL_BREATH,
    mistakes: ['Weit nach hinten lehnen', 'Stange hinter den Nacken ziehen'],
  }),
  def({
    id: 'barbell-row', name: 'Langhantelrudern', eq: 'barbell', lvl: 'intermediate',
    p: ['lats', 'traps'], s: ['biceps', 'deltsRear', 'lowerBack'], reps: [6, 10],
    steps: [
      'Hüftbreit stehen, Oberkörper etwa 45 Grad vorgebeugt, Rücken gerade.',
      'Stange zum Bauchnabel ziehen, Ellbogen nah am Körper.',
      'Kontrolliert absenken.',
    ],
    breath: PULL_BREATH,
    mistakes: ['Runder Rücken', 'Oberkörper richtet sich bei jeder Wiederholung auf'],
    safety: 'Rumpf fest anspannen, bei Rückenbeschwerden brustgestützt rudern.',
  }),
  def({
    id: 'db-row', name: 'Einarmiges Kurzhantelrudern', eq: 'dumbbell', lvl: 'beginner',
    p: ['lats'], s: ['biceps', 'deltsRear', 'traps'], reps: [8, 12],
    steps: [
      'Knie und Hand auf der Bank abstützen, Rücken waagerecht.',
      'Hantel zur Hüfte ziehen.',
      'Langsam ablassen, bis der Arm gestreckt ist.',
    ],
    breath: PULL_BREATH,
    mistakes: ['Oberkörper dreht auf', 'Hantel zur Schulter statt zur Hüfte'],
  }),
  def({
    id: 'seated-cable-row', name: 'Rudern am Kabel', eq: 'cable', lvl: 'beginner',
    p: ['lats', 'traps'], s: ['biceps', 'deltsRear'], reps: [8, 12],
    steps: [
      'Aufrecht sitzen, Knie leicht gebeugt.',
      'Griff zum Bauch ziehen, Schulterblätter zusammen.',
      'Kontrolliert nach vorn lassen, ohne den Rücken zu runden.',
    ],
    breath: PULL_BREATH,
    mistakes: ['Mit dem Oberkörper schaukeln', 'Schultern ziehen hoch'],
  }),
  def({
    id: 'deadlift', name: 'Kreuzheben', eq: 'barbell', lvl: 'intermediate',
    p: ['glutes', 'hamstrings', 'lowerBack'], s: ['traps', 'forearms', 'quads', 'lats'], sets: [3, 5], reps: [3, 6],
    steps: [
      'Mittelfuß unter der Stange, hüftbreiter Stand.',
      'Stange greifen, Hüfte senken, Rücken gerade, Brust heraus.',
      'Aus den Beinen drücken, Stange nah am Körper nach oben führen.',
      'Oben Hüfte strecken, dann kontrolliert absetzen.',
    ],
    breath: LEG_BREATH,
    mistakes: ['Runder Rücken', 'Stange entfernt sich vom Körper', 'Überstrecken am Ende'],
    safety: 'Technik zuerst mit leichtem Gewicht üben. Bei Rückenschmerzen abbrechen.',
  }),
  def({
    id: 'chest-supported-row', name: 'Brustgestütztes Rudern (Maschine)', eq: 'machine', lvl: 'beginner',
    p: ['lats', 'traps'], s: ['deltsRear', 'biceps'], reps: [8, 12],
    steps: [
      'Brust an das Polster, Griffe mit gestreckten Armen fassen.',
      'Griffe zum Körper ziehen, Schulterblätter zusammen.',
      'Langsam zurückführen.',
    ],
    breath: PULL_BREATH,
    mistakes: ['Brust löst sich vom Polster'],
  }),
  def({
    id: 'face-pull', name: 'Face Pulls', eq: 'cable', lvl: 'beginner',
    p: ['deltsRear'], s: ['traps'], reps: [12, 20],
    steps: [
      'Seil auf Augenhöhe einhängen.',
      'Seil Richtung Gesicht ziehen, Hände auseinander, Ellbogen hoch.',
      'Kurz halten, dann langsam zurück.',
    ],
    breath: PULL_BREATH,
    mistakes: ['Zu schweres Gewicht, Oberkörper lehnt zurück'],
  }),
  def({
    id: 'db-shrug', name: 'Kurzhantel-Shrugs', eq: 'dumbbell', lvl: 'beginner',
    p: ['traps'], s: ['forearms'], reps: [10, 15],
    steps: [
      'Aufrecht stehen, Hanteln seitlich.',
      'Schultern gerade nach oben ziehen.',
      'Kurz halten und langsam senken.',
    ],
    breath: 'Beim Hochziehen ausatmen.',
    mistakes: ['Schultern kreisen lassen', 'Kopf nach vorn schieben'],
  }),
  def({
    id: 'back-extension', name: 'Rückenstrecker', eq: 'bodyweight', lvl: 'beginner',
    p: ['lowerBack'], s: ['glutes', 'hamstrings'], reps: [10, 15],
    steps: [
      'Hüfte am Polster, Füße fixiert.',
      'Oberkörper langsam absenken.',
      'Bis zur geraden Linie aufrichten, nicht überstrecken.',
    ],
    breath: 'Beim Aufrichten ausatmen.',
    mistakes: ['Mit Schwung arbeiten', 'Oben ins Hohlkreuz gehen'],
  }),
  def({
    id: 'kb-swing', name: 'Kettlebell Swing', eq: 'kettlebell', lvl: 'intermediate',
    p: ['glutes', 'hamstrings'], s: ['lowerBack', 'abs', 'forearms'], reps: [12, 20],
    steps: [
      'Etwas breiter als hüftbreit stehen, Kettlebell vor den Füßen.',
      'Kettlebell zwischen die Beine schwingen, Hüfte nach hinten schieben.',
      'Hüfte explosiv strecken, Kettlebell schwingt bis Brusthöhe.',
    ],
    breath: 'Beim Strecken der Hüfte kräftig ausatmen.',
    mistakes: ['Aus den Armen heben statt aus der Hüfte', 'Kniebeuge statt Hüftbeuge'],
  }),
  // Schultern
  def({
    id: 'overhead-press', name: 'Schulterdrücken (Langhantel)', eq: 'barbell', lvl: 'intermediate',
    p: ['deltsFront'], s: ['deltsSide', 'triceps', 'traps'], reps: [5, 8],
    steps: [
      'Stange auf Schulterhöhe, Griff schulterbreit.',
      'Gesäß und Bauch anspannen.',
      'Stange gerade über den Kopf drücken, Kopf leicht zurück.',
      'Kontrolliert zurück zur Schulter.',
    ],
    breath: PRESS_BREATH,
    mistakes: ['Starkes Hohlkreuz', 'Stange vor dem Körper statt darüber'],
  }),
  def({
    id: 'db-shoulder-press', name: 'Kurzhantel-Schulterdrücken', eq: 'dumbbell', lvl: 'beginner',
    p: ['deltsFront'], s: ['deltsSide', 'triceps'], reps: [8, 12],
    steps: [
      'Aufrecht sitzen, Hanteln auf Schulterhöhe.',
      'Hanteln über den Kopf drücken.',
      'Langsam absenken.',
    ],
    breath: PRESS_BREATH,
    mistakes: ['Rücken löst sich von der Lehne'],
  }),
  def({
    id: 'lateral-raise', name: 'Seitheben', eq: 'dumbbell', lvl: 'beginner',
    p: ['deltsSide'], s: ['traps'], reps: [12, 20],
    steps: [
      'Aufrecht stehen, Hanteln seitlich.',
      'Arme leicht gebeugt seitlich bis Schulterhöhe heben.',
      'Langsam senken.',
    ],
    breath: 'Beim Heben ausatmen.',
    mistakes: ['Schwung aus dem Oberkörper', 'Schultern ziehen hoch'],
  }),
  def({
    id: 'cable-lateral-raise', name: 'Seitheben am Kabel', eq: 'cable', lvl: 'intermediate',
    p: ['deltsSide'], reps: [12, 20],
    steps: [
      'Seitlich zum Kabelzug stehen, Griff mit der entfernten Hand.',
      'Arm seitlich bis Schulterhöhe heben.',
      'Langsam zurück.',
    ],
    breath: 'Beim Heben ausatmen.',
    mistakes: ['Zu schweres Gewicht'],
  }),
  def({
    id: 'reverse-fly', name: 'Reverse Flys', eq: 'dumbbell', lvl: 'beginner',
    p: ['deltsRear'], s: ['traps'], reps: [12, 20],
    steps: [
      'Vorgebeugt stehen oder auf der Schrägbank liegen.',
      'Arme leicht gebeugt seitlich anheben.',
      'Langsam senken.',
    ],
    breath: 'Beim Heben ausatmen.',
    mistakes: ['Schulterblätter statt Schulter arbeiten lassen', 'Schwung'],
  }),
  def({
    id: 'machine-shoulder-press', name: 'Schulterpresse (Maschine)', eq: 'machine', lvl: 'beginner',
    p: ['deltsFront'], s: ['deltsSide', 'triceps'], reps: [8, 12],
    steps: [
      'Sitz so einstellen, dass die Griffe auf Schulterhöhe sind.',
      'Griffe nach oben drücken.',
      'Kontrolliert zurück.',
    ],
    breath: PRESS_BREATH,
    mistakes: ['Ellbogen ganz durchdrücken und blockieren'],
  }),
  def({
    id: 'front-raise', name: 'Frontheben', eq: 'dumbbell', lvl: 'beginner',
    p: ['deltsFront'], reps: [10, 15],
    steps: ['Hanteln vor den Oberschenkeln.', 'Arme gestreckt bis Schulterhöhe heben.', 'Langsam senken.'],
    breath: 'Beim Heben ausatmen.',
    mistakes: ['Oberkörper lehnt zurück'],
  }),
  // Arme
  def({
    id: 'barbell-curl', name: 'Langhantel-Curls', eq: 'barbell', lvl: 'beginner',
    p: ['biceps'], s: ['forearms'], reps: [8, 12],
    steps: [
      'Stange schulterbreit im Untergriff.',
      'Ellbogen am Körper, Stange nach oben beugen.',
      'Langsam strecken.',
    ],
    breath: 'Beim Beugen ausatmen.',
    mistakes: ['Schwung aus dem Rücken', 'Ellbogen wandern nach vorn'],
  }),
  def({
    id: 'db-curl', name: 'Kurzhantel-Curls', eq: 'dumbbell', lvl: 'beginner',
    p: ['biceps'], s: ['forearms'], reps: [8, 12],
    steps: ['Hanteln seitlich, Handflächen nach vorn.', 'Abwechselnd oder gleichzeitig beugen.', 'Langsam senken.'],
    breath: 'Beim Beugen ausatmen.',
    mistakes: ['Halbe Bewegung', 'Schultern ziehen nach vorn'],
  }),
  def({
    id: 'hammer-curl', name: 'Hammer-Curls', eq: 'dumbbell', lvl: 'beginner',
    p: ['biceps', 'forearms'], reps: [8, 12],
    steps: ['Hanteln im Neutralgriff.', 'Ellbogen am Körper, Hanteln hochbeugen.', 'Langsam senken.'],
    breath: 'Beim Beugen ausatmen.',
    mistakes: ['Schwung'],
  }),
  def({
    id: 'cable-curl', name: 'Kabel-Curls', eq: 'cable', lvl: 'beginner',
    p: ['biceps'], s: ['forearms'], reps: [10, 15],
    steps: ['Stange am unteren Kabel.', 'Ellbogen fixiert, Stange hochbeugen.', 'Langsam strecken.'],
    breath: 'Beim Beugen ausatmen.',
    mistakes: ['Oberkörper lehnt zurück'],
  }),
  def({
    id: 'triceps-pushdown', name: 'Trizepsdrücken am Kabel', eq: 'cable', lvl: 'beginner',
    p: ['triceps'], reps: [10, 15],
    steps: ['Seil oder Stange am oberen Kabel.', 'Ellbogen am Körper, Arme nach unten strecken.', 'Kontrolliert zurück bis 90 Grad.'],
    breath: 'Beim Strecken ausatmen.',
    mistakes: ['Ellbogen bewegen sich nach vorn', 'Oberkörper drückt mit'],
  }),
  def({
    id: 'skull-crusher', name: 'Stirndrücken (SZ-Stange)', eq: 'barbell', lvl: 'intermediate',
    p: ['triceps'], reps: [8, 12],
    steps: ['Auf der Bank liegen, Stange über der Brust.', 'Nur die Unterarme Richtung Stirn absenken.', 'Arme strecken.'],
    breath: 'Beim Strecken ausatmen.',
    mistakes: ['Ellbogen gehen weit auseinander'],
    safety: 'Langsam und kontrolliert absenken, nicht ruckartig.',
  }),
  def({
    id: 'overhead-triceps', name: 'Überkopf-Trizepsstrecken', eq: 'dumbbell', lvl: 'beginner',
    p: ['triceps'], reps: [10, 15],
    steps: ['Hantel mit beiden Händen über dem Kopf.', 'Hinter den Kopf absenken.', 'Wieder strecken.'],
    breath: 'Beim Strecken ausatmen.',
    mistakes: ['Hohlkreuz'],
  }),
  def({
    id: 'close-grip-bench', name: 'Enges Bankdrücken', eq: 'barbell', lvl: 'intermediate',
    p: ['triceps'], s: ['chest', 'deltsFront'], reps: [6, 10],
    steps: ['Griff schulterbreit.', 'Stange zur unteren Brust, Ellbogen nah am Körper.', 'Nach oben drücken.'],
    breath: PRESS_BREATH,
    mistakes: ['Griff zu eng, Druck auf die Handgelenke'],
  }),
  def({
    id: 'wrist-curl', name: 'Handgelenk-Curls', eq: 'dumbbell', lvl: 'beginner',
    p: ['forearms'], reps: [12, 20],
    steps: ['Unterarme auf der Bank, Hände über die Kante.', 'Hantel mit dem Handgelenk nach oben beugen.', 'Langsam senken.'],
    breath: 'Gleichmäßig weiteratmen.',
    mistakes: ['Unterarme heben vom Polster ab'],
  }),
  def({
    id: 'reverse-curl', name: 'Reverse Curls', eq: 'barbell', lvl: 'beginner',
    p: ['forearms'], s: ['biceps'], reps: [10, 15],
    steps: ['Stange im Obergriff.', 'Ellbogen am Körper, Stange hochbeugen.', 'Langsam senken.'],
    breath: 'Beim Beugen ausatmen.',
    mistakes: ['Handgelenke knicken ab'],
  }),
  // Beine
  def({
    id: 'squat', name: 'Kniebeuge', eq: 'barbell', lvl: 'intermediate',
    p: ['quads', 'glutes'], s: ['adductors', 'hamstrings', 'lowerBack'], sets: [3, 5], reps: [5, 8],
    steps: [
      'Stange auf dem oberen Rücken, schulterbreiter Stand, Fußspitzen leicht nach außen.',
      'Rumpf anspannen, Hüfte nach hinten und unten bewegen.',
      'Knie folgen den Fußspitzen, mindestens bis zur Parallele beugen.',
      'Aus den Fersen nach oben drücken.',
    ],
    breath: LEG_BREATH,
    mistakes: ['Knie fallen nach innen', 'Fersen heben ab', 'Runder Rücken am tiefsten Punkt'],
    safety: 'Im Rack mit Sicherheitsablagen trainieren.',
  }),
  def({
    id: 'front-squat', name: 'Frontkniebeuge', eq: 'barbell', lvl: 'advanced',
    p: ['quads'], s: ['glutes', 'abs'], reps: [5, 8],
    steps: ['Stange vorn auf den Schultern, Ellbogen hoch.', 'Aufrecht in die Tiefe beugen.', 'Kraftvoll aufstehen.'],
    breath: LEG_BREATH,
    mistakes: ['Ellbogen sinken ab', 'Oberkörper kippt nach vorn'],
    safety: 'Im Rack mit Sicherheitsablagen trainieren.',
  }),
  def({
    id: 'leg-press', name: 'Beinpresse', eq: 'machine', lvl: 'beginner',
    p: ['quads', 'glutes'], s: ['adductors', 'hamstrings'], reps: [8, 15],
    steps: ['Füße hüftbreit auf der Plattform.', 'Plattform kontrolliert senken, bis die Knie etwa 90 Grad gebeugt sind.', 'Nach oben drücken, ohne die Knie zu blockieren.'],
    breath: LEG_BREATH,
    mistakes: ['Gesäß hebt vom Polster ab', 'Knie durchdrücken'],
  }),
  def({
    id: 'romanian-deadlift', name: 'Rumänisches Kreuzheben', eq: 'barbell', lvl: 'intermediate',
    p: ['hamstrings', 'glutes'], s: ['lowerBack', 'forearms'], reps: [6, 10],
    steps: ['Stange vor den Oberschenkeln, Knie leicht gebeugt.', 'Hüfte nach hinten schieben, Stange nah an den Beinen absenken.', 'Bis zur Dehnung in den Beinbeugern, dann Hüfte strecken.'],
    breath: LEG_BREATH,
    mistakes: ['Runder Rücken', 'Knie zu stark gebeugt'],
  }),
  def({
    id: 'db-lunge', name: 'Ausfallschritte', eq: 'dumbbell', lvl: 'beginner',
    p: ['quads', 'glutes'], s: ['adductors', 'hamstrings'], reps: [8, 12],
    steps: ['Hanteln seitlich, aufrecht stehen.', 'Großen Schritt nach vorn, hinteres Knie Richtung Boden.', 'Über das vordere Bein zurückdrücken.'],
    breath: LEG_BREATH,
    mistakes: ['Vorderes Knie fällt nach innen', 'Schritt zu kurz'],
  }),
  def({
    id: 'bulgarian-split-squat', name: 'Bulgarische Split-Kniebeuge', eq: 'dumbbell', lvl: 'intermediate',
    p: ['quads', 'glutes'], s: ['adductors'], reps: [8, 12],
    steps: ['Hinterer Fuß auf der Bank.', 'Senkrecht nach unten beugen.', 'Über das vordere Bein hochdrücken.'],
    breath: LEG_BREATH,
    mistakes: ['Vorderer Fuß zu nah an der Bank'],
  }),
  def({
    id: 'leg-extension', name: 'Beinstrecker', eq: 'machine', lvl: 'beginner',
    p: ['quads'], reps: [10, 15],
    steps: ['Knie auf Höhe der Drehachse.', 'Beine strecken und kurz halten.', 'Langsam beugen.'],
    breath: 'Beim Strecken ausatmen.',
    mistakes: ['Schwung', 'Gesäß hebt ab'],
  }),
  def({
    id: 'leg-curl', name: 'Beinbeuger liegend', eq: 'machine', lvl: 'beginner',
    p: ['hamstrings'], s: ['calves'], reps: [10, 15],
    steps: ['Bauchlage, Polster über den Fersen.', 'Fersen Richtung Gesäß ziehen.', 'Langsam strecken.'],
    breath: 'Beim Beugen ausatmen.',
    mistakes: ['Hüfte hebt vom Polster ab'],
  }),
  def({
    id: 'hip-thrust', name: 'Hip Thrust', eq: 'barbell', lvl: 'intermediate',
    p: ['glutes'], s: ['hamstrings'], reps: [8, 12],
    steps: ['Oberer Rücken an der Bank, Stange über der Hüfte.', 'Hüfte strecken, bis der Körper von Knie bis Schulter eine Linie bildet.', 'Kontrolliert senken.'],
    breath: 'Beim Strecken ausatmen.',
    mistakes: ['Überstrecken im unteren Rücken'],
    safety: 'Polster für die Stange verwenden.',
  }),
  def({
    id: 'adductor-machine', name: 'Adduktorenmaschine', eq: 'machine', lvl: 'beginner',
    p: ['adductors'], reps: [12, 20],
    steps: ['Polster an den Innenseiten der Knie.', 'Beine zusammenführen.', 'Langsam öffnen.'],
    breath: 'Beim Zusammenführen ausatmen.',
    mistakes: ['Gewicht fällt zurück'],
  }),
  def({
    id: 'standing-calf-raise', name: 'Wadenheben stehend', eq: 'machine', lvl: 'beginner',
    p: ['calves'], reps: [10, 15],
    steps: ['Fußballen auf der Kante, Fersen frei.', 'Fersen so hoch wie möglich heben.', 'Langsam tief absenken.'],
    breath: 'Beim Heben ausatmen.',
    mistakes: ['Federn statt kontrolliert bewegen'],
  }),
  def({
    id: 'seated-calf-raise', name: 'Wadenheben sitzend', eq: 'machine', lvl: 'beginner',
    p: ['calves'], reps: [12, 20],
    steps: ['Polster auf den Oberschenkeln.', 'Fersen heben.', 'Langsam senken.'],
    breath: 'Beim Heben ausatmen.',
    mistakes: ['Halbe Bewegung'],
  }),
  def({
    id: 'bodyweight-calf-raise', name: 'Wadenheben (Körpergewicht)', eq: 'bodyweight', lvl: 'beginner',
    p: ['calves'], reps: [15, 25],
    steps: ['Auf einer Stufe stehen, an der Wand abstützen.', 'Fersen hoch.', 'Langsam unter die Stufe senken.'],
    breath: 'Beim Heben ausatmen.',
    mistakes: ['Zu schnell'],
  }),
  def({
    id: 'goblet-squat', name: 'Goblet Squat', eq: 'kettlebell', lvl: 'beginner',
    p: ['quads', 'glutes'], s: ['adductors', 'abs'], reps: [8, 15],
    steps: ['Kettlebell vor der Brust halten.', 'Aufrecht tief in die Hocke.', 'Aus den Fersen hochdrücken.'],
    breath: LEG_BREATH,
    mistakes: ['Fersen heben ab', 'Oberkörper kippt nach vorn'],
  }),
  def({
    id: 'bodyweight-squat', name: 'Kniebeuge (Körpergewicht)', eq: 'bodyweight', lvl: 'beginner',
    p: ['quads', 'glutes'], s: ['adductors'], reps: [15, 25],
    steps: ['Schulterbreit stehen, Arme nach vorn.', 'Hüfte nach hinten, tief beugen.', 'Aufstehen.'],
    breath: LEG_BREATH,
    mistakes: ['Knie fallen nach innen'],
  }),
  // Bauch
  def({
    id: 'crunch', name: 'Crunches', eq: 'bodyweight', lvl: 'beginner',
    p: ['abs'], reps: [12, 25],
    steps: ['Rückenlage, Beine angewinkelt.', 'Schultern vom Boden rollen.', 'Langsam ablegen.'],
    breath: 'Beim Einrollen ausatmen.',
    mistakes: ['Am Nacken ziehen'],
  }),
  def({
    id: 'hanging-leg-raise', name: 'Beinheben hängend', eq: 'bodyweight', lvl: 'advanced',
    p: ['abs'], s: ['obliques', 'forearms'], reps: [8, 15],
    steps: ['An der Stange hängen.', 'Beine kontrolliert nach vorn heben, Becken einrollen.', 'Langsam senken, ohne zu schwingen.'],
    breath: 'Beim Heben ausatmen.',
    mistakes: ['Schwingen', 'Nur Hüftbeuger statt Bauch arbeiten lassen'],
  }),
  def({
    id: 'cable-crunch', name: 'Kabel-Crunch', eq: 'cable', lvl: 'intermediate',
    p: ['abs'], reps: [10, 15],
    steps: ['Kniend vor dem Kabelzug, Seil am Kopf.', 'Oberkörper einrollen, Ellbogen Richtung Knie.', 'Langsam aufrichten.'],
    breath: 'Beim Einrollen ausatmen.',
    mistakes: ['Aus der Hüfte statt aus dem Bauch beugen'],
  }),
  def({
    id: 'russian-twist', name: 'Russian Twist', eq: 'kettlebell', lvl: 'beginner',
    p: ['obliques'], s: ['abs'], reps: [12, 20],
    steps: ['Sitzen, Oberkörper leicht zurück, Füße am Boden oder angehoben.', 'Kettlebell von Seite zu Seite führen.', 'Rumpf bleibt stabil.'],
    breath: 'Gleichmäßig weiteratmen.',
    mistakes: ['Runder Rücken', 'Nur die Arme bewegen'],
  }),
  def({
    id: 'db-side-bend', name: 'Seitbeugen', eq: 'dumbbell', lvl: 'beginner',
    p: ['obliques'], reps: [12, 20],
    steps: ['Hantel in einer Hand.', 'Zur Seite der Hantel neigen.', 'Aufrichten über die Gegenseite.'],
    breath: 'Beim Aufrichten ausatmen.',
    mistakes: ['Oberkörper dreht'],
  }),
  def({
    id: 'ab-wheel', name: 'Ab-Wheel Rollout', eq: 'bodyweight', lvl: 'advanced',
    p: ['abs'], s: ['lats', 'obliques'], reps: [6, 12],
    steps: ['Kniend, Rad unter den Schultern.', 'Kontrolliert nach vorn rollen, Rumpf fest.', 'Mit dem Bauch zurückziehen.'],
    breath: 'Beim Zurückrollen ausatmen.',
    mistakes: ['Hohlkreuz', 'Zu weit rollen'],
    safety: 'Nur so weit rollen, wie der Rücken gerade bleibt.',
  }),
];

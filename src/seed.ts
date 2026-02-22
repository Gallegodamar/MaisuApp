import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { Item, normalizeEuKey } from './types';

const SEED_ITEMS: Partial<Item>[] = [
  {
    eu: 'Etxea',
    es: 'Casa',
    type: 'hitza',
    level: 'A2',
    topic: 'Etxea',
    exampleEu: 'Nire etxea oso handia da.',
    synonymsEu: ['bizileku'],
  },
  {
    eu: 'Mendi',
    es: 'Monte / Montaña',
    type: 'hitza',
    level: 'A2',
    topic: 'Natura',
    exampleEu: 'Igandean mendira joango gara.',
    synonymsEu: ['Mendia'],
  },
  {
    eu: '...t(z)ea gustatzen zait',
    es: '',
    type: 'egitura',
    level: 'A2',
    topic: 'Zaletasunak',
    exampleEu: 'Irakurtzea gustatzen zait.',
  },
  {
    eu: 'Liburua',
    es: 'Libro',
    type: 'hitza',
    level: 'A2',
    topic: 'Kultura',
    exampleEu: 'Liburu hau oso interesgarria da.',
    synonymsEu: ['Liburu'],
  },
  {
    eu: 'Egun on',
    es: 'Buenos días',
    type: 'hitza',
    level: 'A2',
    topic: 'Agurrak',
    synonymsEu: ['Kaixo'],
  },
  {
    eu: 'Agur',
    es: 'Adiós',
    type: 'hitza',
    level: 'A2',
    topic: 'Agurrak',
    synonymsEu: ['Adeu'],
  },
  {
    eu: 'Zorionak',
    es: 'Felicidades / Enhorabuena',
    type: 'hitza',
    level: 'A2',
    topic: 'Ospakizunak',
    synonymsEu: ['Felicitazioak'],
  },
  {
    eu: 'Eskerrik asko',
    es: 'Muchas gracias',
    type: 'hitza',
    level: 'A2',
    topic: 'Kortesia',
    synonymsEu: ['Mila esker'],
  },
// B1 Structures (corregidas y didácticas)
{ 
  eu: '-t(z)eko', 
  es: 'Para + infinitivo (expresar finalidad)', 
  type: 'egitura', 
  level: 'B1', 
  topic: 'Helburua', 
  exampleEu: 'Dirua aurrezteko, gutxiago gastatzen dut.' 
},
{ 
  eu: '-t(z)en ari izan', 
  es: 'Estar + gerundio (acción en progreso)', 
  type: 'egitura', 
  level: 'B1', 
  topic: 'Ekintza jarraitua', 
  exampleEu: 'Ikasten ari naiz azterketarako.' 
},
{ 
  eu: '-t(z)ean', 
  es: 'Cuando + verbo (simultaneidad o momento puntual)', 
  type: 'egitura', 
  level: 'B1', 
  topic: 'Denbora', 
  exampleEu: 'Etxera iristean, dutxa hartu dut.' 
},
{ 
  eu: '-t(z)etik', 
  es: 'Desde + verbo (origen temporal)', 
  type: 'egitura', 
  level: 'B1', 
  topic: 'Denbora', 
  exampleEu: 'Gaztetatik bizi da herri honetan.' 
},
{ 
  eu: '-t(z)era', 
  es: 'A + infinitivo (movimiento con intención)', 
  type: 'egitura', 
  level: 'B1', 
  topic: 'Mugimendua', 
  exampleEu: 'Erosketak egitera joan naiz.' 
},
{ 
  eu: '-t(z)erako', 
  es: 'Para cuando / antes de (límite temporal)', 
  type: 'egitura', 
  level: 'B1', 
  topic: 'Denbora', 
  exampleEu: 'Ostiralera iristerako lana bukatuta izango dut.' 
},
{ 
  eu: '-t(z)erik ez', 
  es: 'Sin + infinitivo (negación absoluta)', 
  type: 'egitura', 
  level: 'B1', 
  topic: 'Ukazioa', 
  exampleEu: 'Ezer esan gabe joan da.' 
},
{ 
  eu: '-t(z)erik gabe', 
  es: 'Sin + infinitivo (modo o manera)', 
  type: 'egitura', 
  level: 'B1', 
  topic: 'Modua', 
  exampleEu: 'Agur esan gabe alde egin zuen.' 
},
{ 
  eu: '-t(z)eraino', 
  es: 'Hasta + infinitivo (límite final)', 
  type: 'egitura', 
  level: 'B1', 
  topic: 'Denbora', 
  exampleEu: 'Ilundu arte itxaron zuen, etxeratu arte.' 
},
{ 
  eu: '-t(z)erantz', 
  es: 'Hacia + infinitivo (dirección figurada)', 
  type: 'egitura', 
  level: 'B1', 
  topic: 'Norabidea', 
  exampleEu: 'Hobetzerantz doa egoera.' 
},

// B1 Words (ejemplos naturales)
{ 
  eu: 'iritzi', 
  es: 'Opinión o punto de vista personal', 
  type: 'hitza', 
  level: 'B1', 
  topic: 'Komunikazioa', 
  exampleEu: 'Nire iritziz, ideia hori interesgarria da.',
  synonymsEu: ['aburu'] 
},
{ 
  eu: 'laguntza', 
  es: 'Ayuda o apoyo que se ofrece a alguien', 
  type: 'hitza', 
  level: 'B1', 
  topic: 'Gizartea', 
  exampleEu: 'Zure laguntza behar dut arazo hau konpontzeko.',
  synonymsEu: ['babesa'] 
},
{ 
  eu: 'ohitura', 
  es: 'Costumbre o práctica habitual', 
  type: 'hitza', 
  level: 'B1', 
  topic: 'Egunerokoa', 
  exampleEu: 'Goizean goiz jaikitzea ohitura ona da.',
  synonymsEu: ['usadio'] 
},
{ 
  eu: 'auzokide', 
  es: 'Persona que vive en la misma zona o edificio', 
  type: 'hitza', 
  level: 'B1', 
  topic: 'Gizartea', 
  exampleEu: 'Nire auzokidea oso atsegina da.',
  synonymsEu: ['bizilagun'] 
},
{ 
  eu: 'helburu', 
  es: 'Objetivo o meta que se quiere conseguir', 
  type: 'hitza', 
  level: 'B1', 
  topic: 'Ikasketa', 
  exampleEu: 'Gure helburua ahozkotasuna hobetzea da.',
  synonymsEu: ['xede'] 
},
// B2 Structures

{ 
  eu: '-t(z)enez', 
  es: 'Como / ya que (causa conocida por el interlocutor)', 
  type: 'egitura', 
  level: 'B2', 
  topic: 'Kausa', 
  exampleEu: 'Berandu zenez, taxi bat hartu genuen.' 
},
{ 
  eu: '-t(z)earren', 
  es: 'Para / con el fin de (registro más formal que -tzeko)', 
  type: 'egitura', 
  level: 'B2', 
  topic: 'Helburua', 
  exampleEu: 'Azterketa gainditzearren, egunero ikasten du.' 
},
{ 
  eu: '-t(z)ekotan', 
  es: 'Si realmente / en caso de que (condición con intención firme)', 
  type: 'egitura', 
  level: 'B2', 
  topic: 'Baldintza', 
  exampleEu: 'Joatekotan, esan iezadazu lehenago.' 
},
{ 
  eu: '-t(z)eagatik', 
  es: 'Por + infinitivo (causa explícita)', 
  type: 'egitura', 
  level: 'B2', 
  topic: 'Kausa', 
  exampleEu: 'Huts egiteagatik barkamena eskatu zuen.' 
},
{ 
  eu: '-t(z)eaz gain', 
  es: 'Además de + infinitivo', 
  type: 'egitura', 
  level: 'B2', 
  topic: 'Gehikuntza', 
  exampleEu: 'Ikasteaz gain, lan egiten du.' 
},
{ 
  eu: '-t(z)eaz gero', 
  es: 'Una vez que / si (condición con consecuencia lógica)', 
  type: 'egitura', 
  level: 'B2', 
  topic: 'Baldintza', 
  exampleEu: 'Behin erabakia hartzeaz gero, ez dago atzera bueltarik.' 
},
{ 
  eu: '-t(z)eaz arduratu', 
  es: 'Encargarse de + infinitivo', 
  type: 'egitura', 
  level: 'B2', 
  topic: 'Erantzukizuna', 
  exampleEu: 'Proiektua prestatzeaz arduratu da.' 
},
{ 
  eu: '-t(z)eaz ohartu', 
  es: 'Darse cuenta de + infinitivo', 
  type: 'egitura', 
  level: 'B2', 
  topic: 'Kontzientzia', 
  exampleEu: 'Akatsa egiteaz ohartu zen beranduago.' 
},
{ 
  eu: '-t(z)eaz damutu', 
  es: 'Arrepentirse de + infinitivo', 
  type: 'egitura', 
  level: 'B2', 
  topic: 'Sentimenduak', 
  exampleEu: 'Hala hitz egiteaz damutu zen.' 
},
{ 
  eu: '-t(z)eaz konbentzitu', 
  es: 'Convencer de + infinitivo', 
  type: 'egitura', 
  level: 'B2', 
  topic: 'Argudioa', 
  exampleEu: 'Proiektua onartzeaz konbentzitu gintuen.' 
},

// B2 Words

{ 
  eu: 'argudio', 
  es: 'Razón que apoya una idea o postura', 
  type: 'hitza', 
  level: 'B2', 
  topic: 'Diskurtsoa', 
  exampleEu: 'Bere argudioak sendoak dira.',
  synonymsEu: ['arrazoibide'] 
},
{ 
  eu: 'ondorio', 
  es: 'Resultado o conclusión lógica', 
  type: 'hitza', 
  level: 'B2', 
  topic: 'Diskurtsoa', 
  exampleEu: 'Azken ondorioa argia da.',
  synonymsEu: ['konklusio'] 
},
{ 
  eu: 'eragina', 
  es: 'Influencia que algo ejerce sobre otra cosa', 
  type: 'hitza', 
  level: 'B2', 
  topic: 'Gizartea', 
  exampleEu: 'Teknologiak eragin handia du gazteengan.',
  synonymsEu: ['inpaktua'] 
},
{ 
  eu: 'aniztasun', 
  es: 'Diversidad o variedad', 
  type: 'hitza', 
  level: 'B2', 
  topic: 'Gizartea', 
  exampleEu: 'Kultur aniztasuna aberasgarria da.',
  synonymsEu: ['dibertsitate'] 
},
{ 
  eu: 'joera', 
  es: 'Tendencia o inclinación hacia algo', 
  type: 'hitza', 
  level: 'B2', 
  topic: 'Gizartea', 
  exampleEu: 'Azken urteetan joera hori handitu da.',
  synonymsEu: ['tendentzia'] 
},
 // C1 Structures

{ 
  eu: '-t(z)era iritsi', 
  es: 'Llegar a + infinitivo (resultado extremo o inesperado)', 
  type: 'egitura', 
  level: 'C1', 
  topic: 'Ondorioa', 
  exampleEu: 'Haserretzera iritsi zen eztabaidan.' 
},
{ 
  eu: '-t(z)earen ondorioz', 
  es: 'Como consecuencia de + infinitivo', 
  type: 'egitura', 
  level: 'C1', 
  topic: 'Kausa-ondorioa', 
  exampleEu: 'Neurriak hartzearen ondorioz, egoera hobetu da.' 
},
{ 
  eu: '-t(z)earen harira', 
  es: 'A propósito de / en relación con + infinitivo', 
  type: 'egitura', 
  level: 'C1', 
  topic: 'Diskurtsoa', 
  exampleEu: 'Gai hori aipatzearen harira, beste kontu bat azpimarratu nahi dut.' 
},
{ 
  eu: '-t(z)earen poderioz', 
  es: 'Gracias a / debido a (resultado progresivo)', 
  type: 'egitura', 
  level: 'C1', 
  topic: 'Kausa', 
  exampleEu: 'Lan gogorra egitearen poderioz lortu du arrakasta.' 
},
{ 
  eu: '-t(z)earen ildotik', 
  es: 'Siguiendo la línea de / en coherencia con', 
  type: 'egitura', 
  level: 'C1', 
  topic: 'Diskurtso akademikoa', 
  exampleEu: 'Ikerketa horren ildotik, beste azterketa bat egin da.' 
},
{ 
  eu: '-t(z)earen baitan', 
  es: 'Dentro del marco de + infinitivo', 
  type: 'egitura', 
  level: 'C1', 
  topic: 'Testuingurua', 
  exampleEu: 'Proiektuaren baitan hainbat jarduera antolatu dira.' 
},
{ 
  eu: '-t(z)earen arabera', 
  es: 'Según + infinitivo / conforme a', 
  type: 'egitura', 
  level: 'C1', 
  topic: 'Iturria', 
  exampleEu: 'Adituek esatearen arabera, neurriak eraginkorrak dira.' 
},
{ 
  eu: '-t(z)earen truke', 
  es: 'A cambio de + infinitivo', 
  type: 'egitura', 
  level: 'C1', 
  topic: 'Trukea', 
  exampleEu: 'Laguntzearen truke ez du ezer eskatu.' 
},
{ 
  eu: '-t(z)earen aurrean', 
  es: 'Ante / frente a + infinitivo', 
  type: 'egitura', 
  level: 'C1', 
  topic: 'Jarrera', 
  exampleEu: 'Egoera horren aurrean, erabaki ausarta hartu zuten.' 
},
{ 
  eu: '-t(z)earen alde', 
  es: 'A favor de + infinitivo', 
  type: 'egitura', 
  level: 'C1', 
  topic: 'Jarrera', 
  exampleEu: 'Aldaketa egitearen alde agertu da.' 
},

// C1 Words

{ 
  eu: 'hausnarketa', 
  es: 'Reflexión profunda y razonada', 
  type: 'hitza', 
  level: 'C1', 
  topic: 'Diskurtso akademikoa', 
  exampleEu: 'Hausnarketa sakona egin behar da gai honen inguruan.',
  synonymsEu: ['gogoeta'] 
},
{ 
  eu: 'ikuspegi', 
  es: 'Punto de vista o perspectiva', 
  type: 'hitza', 
  level: 'C1', 
  topic: 'Diskurtso akademikoa', 
  exampleEu: 'Ikuspegi kritikoa ezinbestekoa da.',
  synonymsEu: ['perspektiba'] 
},
{ 
  eu: 'ñabardura', 
  es: 'Matiz o pequeña diferencia de significado', 
  type: 'hitza', 
  level: 'C1', 
  topic: 'Hizkuntza', 
  exampleEu: 'Ñabardura hori kontuan hartu behar da.',
  synonymsEu: ['matiz'] 
},
{ 
  eu: 'koherentzia', 
  es: 'Relación lógica y ordenada entre ideas', 
  type: 'hitza', 
  level: 'C1', 
  topic: 'Diskurtsoa', 
  exampleEu: 'Testuak koherentzia falta du zenbait zatitan.',
  synonymsEu: ['trinkotasun'] 
},
{ 
  eu: 'ikusmolde', 
  es: 'Manera de entender o interpretar una realidad', 
  type: 'hitza', 
  level: 'C1', 
  topic: 'Diskurtso akademikoa', 
  exampleEu: 'Ikusmolde berriak eztabaida aberastu du.',
  synonymsEu: ['ikuskera'] 
}
];

const activeSeedJobs = new Map<string, Promise<void>>();

export async function seedDatabase(teacherId: string) {
  const runningJob = activeSeedJobs.get(teacherId);
  if (runningJob) {
    return runningJob;
  }

  const job = (async () => {
    const now = new Date().toISOString();

    // Migration: Convert legacy A1 items to A2 only for the current teacher.
    const teacherItems = await db.items.where('teacherId').equals(teacherId).toArray();
    for (const existingItem of teacherItems) {
      if ((existingItem as any).level === 'A1') {
        await db.items.update(existingItem.id, { level: 'A2', updatedAt: now });
      }
    }
    
    for (const item of SEED_ITEMS) {
      const eu = item.eu?.trim();
      const type = item.type;
      const euKey = eu ? normalizeEuKey(eu) : '';
      if (!eu || !type || !euKey) continue;

      const existing = await db.items
        .where('[teacherId+type+euKey]')
        .equals([teacherId, type, euKey])
        .first();
      
      if (!existing) {
        try {
          await db.items.add({
            ...item,
            eu,
            euKey,
            id: uuidv4(),
            teacherId,
            favorite: false,
            createdAt: now,
            updatedAt: now,
          } as Item);
        } catch (error: any) {
          if (error?.name !== 'ConstraintError') {
            throw error;
          }
        }
        continue;
      }

      // Non-destructive sync: only fill gaps so teacher edits are preserved.
      const updates: Partial<Item> = {};
      if (existing.euKey !== euKey) updates.euKey = euKey;

      if (!existing.es?.trim() && item.es) updates.es = item.es;
      if (!existing.exampleEu?.trim() && item.exampleEu) updates.exampleEu = item.exampleEu;
      if (!existing.topic?.trim() && item.topic) updates.topic = item.topic;
      if ((!existing.synonymsEu || existing.synonymsEu.length === 0) && item.synonymsEu) {
        updates.synonymsEu = [...item.synonymsEu];
      }
      if (existing.level === 'Mailarik gabe' && item.level && item.level !== 'Mailarik gabe') {
        updates.level = item.level;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = now;
        await db.items.update(existing.id, updates);
      }
    }

    console.log('Database seeded/synchronized for teacher:', teacherId);
  })();

  activeSeedJobs.set(teacherId, job);
  try {
    await job;
  } finally {
    activeSeedJobs.delete(teacherId);
  }
}

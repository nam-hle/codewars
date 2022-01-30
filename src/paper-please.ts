function stringListToArray(list: string | null): string[] | null {
  if (list === null) return null;
  return list
    .replace(/and/g, ',')
    .replace(/,\s+,/g, ',')
    .split(',')
    .map((e) => e.trim());
}

enum SubjectType {
  CITIZENS = 'citizens',
  FOREIGNERS = 'foreigners',
  OTHERS = 'others',
}

interface SubjectBase {
  subjectType: SubjectType;
}

interface CitizenSubject extends SubjectBase {
  subjectType: SubjectType.CITIZENS;
  countries: string[];
}

interface ForeignerSubject extends SubjectBase {
  subjectType: SubjectType.FOREIGNERS;
}

interface OtherSubject extends SubjectBase {
  subjectType: SubjectType.OTHERS;
  name: string;
}

type Subject = CitizenSubject | ForeignerSubject | OtherSubject;

class DocumentManager {
  public requirements: { subject: Subject; document: string }[] = [];

  public add(bulletin: string): void {
    const [subject, document] = bulletin.split('require');
    console.log({ subject, document });
    this.requirements.push({ subject: DocumentManager.parseSubject(subject), document: document.trim() });
  }

  private static parseSubject(s: string): Subject {
    if (/Foreigners/gi.test(s))
      return {
        subjectType: SubjectType.FOREIGNERS,
      };

    if (/Citizens of/gi.test(s)) {
      const countries = /Citizens of (?<countries>.*)/.exec(s)?.groups?.countries;
      if (!countries) throw new Error('Invalid subject');
      const countriesList = stringListToArray(countries);
      if (!countriesList) throw new Error('Invalid subject');
      return {
        subjectType: SubjectType.CITIZENS,
        countries: countriesList,
      };
    }

    return {
      subjectType: SubjectType.OTHERS,
      name: s.trim().toLowerCase(),
    };
  }

  public toString(): string {
    return `DocumentManager\n${this.requirements.map((r) => JSON.stringify(r, null, 2)).join('\n')}`;
  }
}

class CriminalManager {
  private data: string[] = [];
  public update(name: string) {
    console.log({ name });
    this.data.push(name);
  }
  public toString() {
    return `CriminalManager: ${this.data.join(', ')}`;
  }
}

class VaccinationManager {
  readonly vaccines: Record<string, string[] | null> = {};

  public update(vaccine: string, countries: string | null): void {
    const countriesList = stringListToArray(countries);
    const currentState = this.vaccines[vaccine];
    if (Array.isArray(currentState) && Array.isArray(countriesList)) {
      currentState.push(...countriesList);
      return;
    }
    this.vaccines[vaccine] = countriesList;
  }

  public isRequired(vaccine: string, country: string): boolean {
    const currentState = this.vaccines[vaccine];
    if (currentState === null) return false;
    return currentState.includes(country);
  }

  public toString(): string {
    return `VaccinationManager:\n${JSON.stringify(this.vaccines, null, 2)}`;
  }
}

type Allowance = 'allow' | 'deny';

class CitizenManager {
  readonly citizens: Record<string, Allowance> = {};

  public update(citizens: string, allowance: Allowance): void {
    stringListToArray(citizens)?.forEach((citizen) => {
      this.citizens[citizen] = allowance;
    });
  }
  public toString(): string {
    return `CitizenManager:\n${JSON.stringify(this.citizens, null, 2)}`;
  }
}

class Inspector {
  vaccinationManager: VaccinationManager;
  citizenManager: CitizenManager;
  criminalManager: CriminalManager;
  documentManager: DocumentManager;
  debug = true;
  constructor() {
    this.vaccinationManager = new VaccinationManager();
    this.citizenManager = new CitizenManager();
    this.criminalManager = new CriminalManager();
    this.documentManager = new DocumentManager();
  }

  public print(): void {
    if (!this.debug) return;
    console.log(this.vaccinationManager.toString());
    console.log(this.citizenManager.toString());
    console.log(this.criminalManager.toString());
    console.log(this.documentManager.toString());
  }

  receiveBulletin(bulletin: string): void {
    if (bulletin.match(/vaccination/gi)) {
      this.processVaccinationBulletin(bulletin);
    } else if (bulletin.match(/wanted/gi)) {
      this.processCriminalBulletin(bulletin);
    } else if (bulletin.match(/citizens/gi)) {
      if (bulletin.match(/require/gi)) {
        this.processDocumentBulletin(bulletin);
      } else {
        this.processCitizensBulletin(bulletin);
      }
    } else {
      this.processDocumentBulletin(bulletin);
    }
    this.print();
  }
  processVaccinationBulletin(bulletin: string): void {
    const RequiredRegex = /Citizens of (?<countries>.*) require (?<name>\w+) vaccination/gi;
    let match = RequiredRegex.exec(bulletin);
    if (match) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { countries, name } = match.groups;
      this.vaccinationManager.update(name, countries);
    }

    const RemoveRequirementRegex = /no longer require (?<name>\w+) vaccination/gi;
    match = RemoveRequirementRegex.exec(bulletin);
    if (match) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { name } = match.groups;
      this.vaccinationManager.update(name, null);
    }
  }

  processCriminalBulletin(bulletin: string): void {
    const WantedRegex = /Wanted by the State: (?<name>.+)/gi;
    const match = WantedRegex.exec(bulletin);
    if (match) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore

      const { name } = match.groups;
      this.criminalManager.update(name);
    }
  }
  processCitizensBulletin(bulletin: string): void {
    const AllowanceRegex = /(?<allowance>allow|deny) citizens of (?<countries>.*)/gi;
    const match = AllowanceRegex.exec(bulletin);
    if (match) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { allowance, countries } = match.groups;

      this.citizenManager.update(countries, allowance.toLowerCase() === 'allow' ? 'allow' : 'deny');
    }
  }
  processDocumentBulletin(bulletin: string): void {
    this.documentManager.add(bulletin);
  }
}

const citizenBulletins = ['Allow citizens of Obristan', 'Deny citizens of Kolechia, Republia'];
const vaccinationBulletins = ['Citizens of Antegria, Republia, Obristan require polio vaccination', 'Entrants no longer require tetanus vaccination'];
const criminalBulletins = ['Wanted by the State: Hubert Popovic'];
const documentBulletins = ['Foreigners require access permit', 'Citizens of Arstotzka require ID card', 'Workers require work pass'];

const inspector = new Inspector();
// inspector.receiveBulletin(citizenBulletins[0]);
// inspector.receiveBulletin(citizenBulletins[1]);
// inspector.receiveBulletin(vaccinationBulletins[0]);
// inspector.receiveBulletin(vaccinationBulletins[1]);
inspector.receiveBulletin(documentBulletins[2]);

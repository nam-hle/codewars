export function stringListToArray(list: string | null): string[] | null {
  if (list === null) return null;
  return list
    .replace(/and/g, ',')
    .replace(/,\s+,/g, ',')
    .split(',')
    .map((e) => e.trim());
}

export function stringify(obj: unknown) {
  return JSON.stringify(obj, null, 2);
}

export class Manager {
  constructor(public name: string, public debugging: boolean = true) {}

  public accept(entrantDocuments: EntrantDocuments): true | string {
    return true;
  }

  public isEmpty(): boolean {
    throw new Error('Method not implemented.');
  }

  public print(): void {
    if (!this.isEmpty()) {
      console.log(this.toString());
    }
  }

  public toString() {
    const strings = [this.name.padEnd(20, '*'), this.serialize(), '*'.padEnd(20, '*')];
    return strings.join('\n');
  }

  public serialize(): string {
    throw new Error('Not implemented');
  }

  public inspect(entrantDocuments: EntrantDocuments): boolean | string[] {
    throw new Error('Not implemented');
  }

  public add(bulletin: string): Manager {
    console.log(`${this.name} receives:\n'${bulletin}'`);
    return this;
  }

  public isEqual(other: string): boolean {
    throw new Error('Not implemented');
  }
}

enum DocumentKind {
  PASSPORT = 'passport',
  VACCINATION = 'certificate_of_vaccination',
  ID_CARD = 'ID_card',
  ACCESS_PERMIT = 'access_permit',
  WORK_PASS = 'work_pass',
  GRANT_OF_ASYLUM = 'grant_of_asylum',
  DIPLOMATIC_AUTHORIZATION = 'diplomatic_authorization',
}

type DocumentInfo = Record<string, string | Date | undefined>;
export class EntrantDocuments {
  data: Record<string, DocumentInfo> = {};
  errors: string[] = [];

  public add(documentType: string, documentDetails: string) {
    if (!Object.values(DocumentKind).includes(documentType as DocumentKind)) {
      throw new Error("Invalid document type: '" + documentType + "'");
    }
    const documentInfo: DocumentInfo = {};
    Object.entries(EntrantDocuments.parse(documentDetails)).forEach(([key, value]) => {
      if (['dob', 'exp'].includes(key)) {
        documentInfo[key] = new Date(value ?? '');
      } else {
        documentInfo[key] = value ?? '';
      }
    });
    this.data[documentType] = documentInfo;
    return this;
  }

  public getName(): string {
    const name = this.data?.passport?.name;
    if (typeof name !== 'string') {
      return '';
    }
    const [firstName, lastName] = name.split(', ');
    return `${lastName} ${firstName}`;
  }

  public getAllDocumentTypes(): string[] {
    return Object.keys(this.data).map((e) => e.replace(/\_/g, ' '));
  }

  public getNation(): string {
    const nation = this.data?.passport?.nation;
    if (typeof nation !== 'string') {
      return '';
    }
    return nation;
  }

  validateExpiredDate(documentType: string, documentInfo: DocumentInfo): void {
    if (documentInfo.exp && documentInfo.exp <= new Date(1982, 10, 22)) {
      this.errors.push(`${documentType.replace(/\_/g, ' ')} expired`);
    }
  }

  validateDiplomatic(documentType: string, documentInfo: DocumentInfo): void {
    if (documentType === DocumentKind.DIPLOMATIC_AUTHORIZATION) {
      if (documentInfo.access && typeof documentInfo.access === 'string' && !documentInfo.access.split(',').includes('Arstotzka')) {
        this.errors.push(`invalid ${documentType.replace('_', ' ')}`);
      }
    }
  }

  validate() {
    for (let i = 0; i < Object.keys(this.data).length; i++) {
      const documentType = Object.keys(this.data)[i];
      const documentInfo = this.data[documentType];

      for (let j = i + 1; j < Object.keys(this.data).length; j++) {
        const currentDocument = this.data[Object.keys(this.data)[j]];
        for (const key of Object.keys(documentInfo)) {
          if (Object.keys(currentDocument).includes(key)) {
            if (stringify(currentDocument[key]) !== stringify(documentInfo[key])) {
              if (key === 'exp') continue;
              let s = key;
              if (key === 'id#') s = 'ID number';
              if (key === 'nation') s = 'nationality';
              this.errors.push(`${s} mismatch`);
            }
          }
        }
      }

      this.validateExpiredDate(documentType, documentInfo);
      this.validateDiplomatic(documentType, documentInfo);
    }

    return this;
  }

  static parse(s: string): Record<string, string | undefined> {
    return s.split('\n').reduce<Record<string, string | undefined>>((r, e) => {
      const [key, value] = e.split(':').map((x) => x.trim());
      r[key.toLowerCase()] = value;
      return r;
    }, {});
  }

  public hasDocument(documentType: string): boolean {
    return Object.keys(this.data).includes(documentType);
  }

  public toString() {
    return stringify(this.data);
  }
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

export class DocumentManager extends Manager {
  public requirements: { subject: Subject; document: string }[] = [];

  constructor() {
    super('DocumentManager');
  }

  public accept(entrantDocuments: EntrantDocuments) {
    console.log('@@@', entrantDocuments.getAllDocumentTypes());
    for (const requirement of this.requirements) {
      const { subject, document } = requirement;
      if (DocumentManager.isTargetSubject(subject, entrantDocuments)) {
        if (!entrantDocuments.getAllDocumentTypes().includes(document)) {
          if (
            document === 'access permit' &&
            (entrantDocuments.getAllDocumentTypes().includes('diplomatic authorization') ||
              entrantDocuments.getAllDocumentTypes().includes('grant of asylum'))
          ) {
            continue;
          }
          return `missing required ${document}`;
        }
      }
    }
    return true;
  }

  static isTargetSubject(subject: Subject, entrantDocuments: EntrantDocuments): boolean {
    if (subject.subjectType === SubjectType.OTHERS) {
      return subject.name === 'entrants';
    }
    if (subject.subjectType === SubjectType.FOREIGNERS) {
      return entrantDocuments.getNation() !== 'Arstotzka';
    }
    if (subject.subjectType === SubjectType.CITIZENS) {
      return subject.countries.includes(entrantDocuments.getNation());
    }
    throw new Error(`Unsupported subject type: ${stringify(subject)}`);
  }

  public add(bulletin: string) {
    super.add(bulletin);
    const [subject, document] = bulletin.split('require');
    this.requirements.push({ subject: DocumentManager.parseSubject(subject), document: document.trim() });
    return this;
  }

  private static parseSubject(s: string): Subject {
    if (/Foreigners/gi.test(s))
      return {
        subjectType: SubjectType.FOREIGNERS,
      };

    if (/Citizens of/gi.test(s)) {
      const countries = /Citizens of (.*)/.exec(s)?.[1];
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

  public isEmpty(): boolean {
    return this.requirements.length === 0;
  }

  public serialize(): string {
    return this.requirements.map(stringify).join('\n');
  }

  public isEqual(other: string): boolean {
    return this.serialize() === other;
  }
}

export class CriminalManager extends Manager {
  private data: string[] = [];

  constructor() {
    super('CriminalManager');
  }

  accept(entrantDocuments: EntrantDocuments) {
    const acceptance = this.data.some((criminal) => entrantDocuments.getName() === criminal);
    if (acceptance) {
      return 'Entrant is a wanted criminal';
    }
    return true;
  }

  public isEmpty(): boolean {
    return this.data.length === 0;
  }

  public add(bulletin: string) {
    super.add(bulletin);
    const WantedRegex = /Wanted by the State: (.+)/gi;
    const match = WantedRegex.exec(bulletin);
    if (match) {
      const [_, name] = match;
      this.update(name);
    }
    return this;
  }

  public update(name: string) {
    this.data.push(name);
  }
  public serialize() {
    return stringify(this.data);
  }
  public isEqual(other: string): boolean {
    return this.serialize() === other;
  }
}

export class VaccinationManager extends Manager {
  readonly data: Record<string, string[] | null> = {};
  constructor() {
    super('VaccinationManager');
  }

  public accept(entrantDocuments: EntrantDocuments): true | string {
    for (const requirement of Object.values(this.data)) {
      if (requirement && requirement.includes(entrantDocuments.getNation())) {
        if (!entrantDocuments.getAllDocumentTypes().includes('certificate of vaccination')) {
          return 'missing required certificate of vaccination';
        }
      }
    }
    return true;
  }

  public isEmpty(): boolean {
    return Object.keys(this.data).length === 0;
  }

  public add(bulletin: string) {
    super.add(bulletin);
    const RequiredRegex = /Citizens of (.*) require (\w+) vaccination/gi;
    let match = RequiredRegex.exec(bulletin);
    if (match) {
      const [_, countries, name] = match;
      this.update(name, countries);
    }

    const RemoveRequirementRegex = /no longer require (\w+) vaccination/gi;
    match = RemoveRequirementRegex.exec(bulletin);
    if (match) {
      const [_, name] = match;
      this.update(name, null);
    }
    return this;
  }

  public update(vaccine: string, countries: string | null): void {
    const countriesList = stringListToArray(countries);
    const currentState = this.data[vaccine];
    if (Array.isArray(currentState) && Array.isArray(countriesList)) {
      currentState.push(...countriesList);
      return;
    }
    this.data[vaccine] = countriesList;
  }

  public isRequired(vaccine: string, country: string): boolean {
    const currentState = this.data[vaccine];
    if (currentState === null) return false;
    return currentState.includes(country);
  }

  public serialize(): string {
    return stringify(this.data);
  }
  public isEqual(other: string): boolean {
    return this.serialize() === other;
  }
}

type Allowance = 'allow' | 'deny';

export const NATIONS = ['Arstotzka', 'Antegria', 'Impor', 'Kolechia', 'Obristan', 'Republia', 'United Federation'];

export enum NationEnum {
  Arstotzka = 'Arstotzka',
  Antegria = 'Antegria',
  Impor = 'Impor',
  Kolechia = 'Kolechia',
  Obristan = 'Obristan',
  Republia = 'Republia',
  UnitedFederation = 'United Federation',
}

export class CitizenManager extends Manager {
  readonly data: Record<string, Allowance> = {};
  constructor() {
    super('CitizenManager');
  }

  public isEmpty(): boolean {
    return Object.keys(this.data).length === 0;
  }

  public accept(entrantDocuments: EntrantDocuments) {
    const nation = entrantDocuments.data.passport.nation;
    if (typeof nation !== 'string') {
      throw new Error('expect string nation');
    }
    const status = this.data[nation];
    if (status === 'allow') return true;
    return `citizen of banned nation`;
  }

  public add(bulletin: string) {
    super.add(bulletin);
    const AllowanceRegex = /(allow|deny) citizens of (.*)/gi;
    const match = AllowanceRegex.exec(bulletin);
    if (match) {
      const [_, allowance, countries] = match;

      this.update(countries, allowance.toLowerCase() === 'allow' ? 'allow' : 'deny');
    }
    return this;
  }
  public update(citizens: string, allowance: Allowance): void {
    stringListToArray(citizens)?.forEach((citizen) => {
      this.data[citizen] = allowance;
    });
  }

  public serialize(): string {
    return stringify(this.data);
  }

  public isEqual(other: string): boolean {
    return this.serialize() === other;
  }
}

export class Inspector {
  vaccinationManager: VaccinationManager;
  citizenManager: CitizenManager;
  criminalManager: CriminalManager;
  documentManager: DocumentManager;

  bulletins: string[] = [];
  managers: Manager[] = [];
  debug = true;
  constructor() {
    this.documentManager = new DocumentManager();
    this.vaccinationManager = new VaccinationManager();
    this.citizenManager = new CitizenManager();
    this.criminalManager = new CriminalManager();
    this.managers.push(this.criminalManager, this.documentManager, this.vaccinationManager, this.citizenManager);
  }

  public print(): void {
    if (!this.debug) return;
    this.managers.forEach((manager) => manager.print());
  }

  receiveBulletin(bulletins: string): void {
    console.log('===========================');
    console.log('Received: ' + bulletins);
    console.log('===========================\n');

    bulletins.split('\n').forEach((bulletin) => {
      this.bulletins.push(bulletin);
      if (bulletin.match(/vaccination/gi)) {
        this.vaccinationManager.add(bulletin);
      } else if (bulletin.match(/wanted/gi)) {
        this.criminalManager.add(bulletin);
      } else if (bulletin.match(/citizens/gi)) {
        if (bulletin.match(/require/gi)) {
          this.documentManager.add(bulletin);
        } else {
          this.citizenManager.add(bulletin);
        }
      } else {
        this.documentManager.add(bulletin);
      }
    });
    this.print();
  }

  inspect(documents: Record<string, string>): string {
    console.log('===========================');
    console.log(`\nInspect:\n${stringify(documents)}`);
    console.log('===========================');
    console.log('Bulletins: \n');
    console.log(this.bulletins.map((e) => `"${e}"`).join(',\n'));
    console.log('\nData: \n');
    this.print();
    console.log('===========================\n');
    const entrantDocuments = new EntrantDocuments();
    for (const [documentKind, documentDetails] of Object.entries(documents)) {
      entrantDocuments.add(documentKind, documentDetails);
    }

    const criminalAcceptance = this.criminalManager.accept(entrantDocuments);
    if (criminalAcceptance !== true) {
      console.log(`Denied by CriminalManager: ${criminalAcceptance}`);
      return `Detainment: ${criminalAcceptance}.`;
    }

    entrantDocuments.validate();
    if (entrantDocuments.errors.length) {
      const title = entrantDocuments.errors.some((e) => e.includes('mismatch')) ? 'Detainment' : 'Entry denied';
      return `${title}: ${entrantDocuments.errors[0]}.`;
    }

    for (const manager of this.managers) {
      if (manager.name === 'CriminalManager') {
        continue;
      }
      const acceptance = manager.accept(entrantDocuments);

      if (acceptance !== true) {
        console.log(`Denied by ${manager.constructor.name}: ${acceptance}`);
        return `Entry denied: ${acceptance}.`;
      }
    }

    if (entrantDocuments.data.passport.nation === NationEnum.Arstotzka) {
      return 'Glory to Arstotzka.';
    }

    return 'Cause no trouble.';
  }
}

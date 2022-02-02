import { expect } from 'chai';
import {
  CitizenManager,
  stringify,
  Manager,
  Inspector,
  EntrantDocuments,
  DocumentManager,
  VaccinationManager,
  CriminalManager,
} from './index';

describe('test', () => {
  function setup(manager: Manager, bulletin: string, expected: unknown) {
    expect(manager.add(bulletin).serialize()).to.equal(stringify(expected));
  }

  it('CitizenManager', () => {
    const citizenBulletins = ['Allow citizens of Obristan', 'Deny citizens of Kolechia, Republia'];

    setup(new CitizenManager(), citizenBulletins[0], { Obristan: 'allow' });
    setup(new CitizenManager(), citizenBulletins[1], { Kolechia: 'deny', Republia: 'deny' });
  });

  it('CriminalManager', () => {
    const criminalBulletins = ['Wanted by the State: Hubert Popovic'];
    setup(new CriminalManager(), criminalBulletins[0], ['Hubert Popovic']);
  });

  it('DocumentManager', () => {
    const documentBulletins = ['Foreigners require access permit', 'Citizens of Arstotzka require ID card', 'Workers require work pass'];
    setup(new DocumentManager(), documentBulletins[0], {
      subject: {
        subjectType: 'foreigners',
      },
      document: 'access permit',
    });
    setup(new DocumentManager(), documentBulletins[1], {
      subject: {
        subjectType: 'citizens',
        countries: ['Arstotzka'],
      },
      document: 'ID card',
    });
    setup(new DocumentManager(), documentBulletins[2], {
      subject: {
        subjectType: 'others',
        name: 'workers',
      },
      document: 'work pass',
    });
  });

  it('VaccinationManager', () => {
    const vaccinationBulletins = [
      'Citizens of Antegria, Republia, Obristan require polio vaccination',
      'Entrants no longer require tetanus vaccination',
    ];
    setup(new VaccinationManager(), vaccinationBulletins[0], {
      polio: ['Antegria', 'Republia', 'Obristan'],
    });
    setup(new VaccinationManager(), vaccinationBulletins[1], { tetanus: null });
  });

  it('Passport', () => {
    const passport = `ID#: GC07D-FU8AR
    NATION: Arstotzka
    NAME: Guyovich, Russian
    DOB: 1933.11.28
    SEX: M
    ISS: East Grestin
    EXP: 1983.07.10`;

    expect(new EntrantDocuments().add('passport', passport).toString()).deep.equal(
      stringify({
        passport: {
          'id#': 'GC07D-FU8AR',
          nation: 'Arstotzka',
          name: 'Guyovich, Russian',
          dob: '1933-11-27T17:00:00.000Z',
          sex: 'M',
          iss: 'East Grestin',
          exp: '1983-07-09T17:00:00.000Z',
        },
      })
    );

    expect(
      new EntrantDocuments()
        .add(
          'passport',
          'ID#: VZP61-BAY82\nNATION: Kolechia\nNAME: Kovacs, Brenna\nDOB: 1921.09.14\nSEX: F\nISS: Yurko City\nEXP: 1981.11.03'
        )
        .validate().errors
    ).deep.equal(['passport expired']);
  });

  describe('main', () => {
    function f(bulletins: string[], entrants: Record<string, string>, expected: string) {
      const inspector = new Inspector();
      inspector.receiveBulletin(bulletins.join('\n'));
      expect(inspector.inspect(entrants)).to.equal(expected);
    }
    it('basic', () => {
      const inspector = new Inspector();
      const bulletin = 'Entrants require passport\nAllow citizens of Arstotzka, Obristan';
      inspector.receiveBulletin(bulletin);

      const josef = {
        passport: 'ID#: GC07D-FU8AR\nNATION: Arstotzka\nNAME: Costanza, Josef\nDOB: 1933.11.28\nSEX: M\nISS: East Grestin\nEXP: 1983.03.15',
      };
      const guyovich = {
        access_permit:
          'NAME: Guyovich, Russian\nNATION: Obristan\nID#: TE8M1-V3N7R\nPURPOSE: TRANSIT\nDURATION: 14 DAYS\nHEIGHT: 159cm\nWEIGHT: 60kg\nEXP: 1983.07.13',
      };
      const roman = {
        passport:
          'ID#: WK9XA-LKM0Q\nNATION: United Federation\nNAME: Dolanski, Roman\nDOB: 1933.01.01\nSEX: M\nISS: Shingleton\nEXP: 1983.05.12',
        grant_of_asylum:
          'NAME: Dolanski, Roman\nNATION: United Federation\nID#: Y3MNC-TPWQ2\nDOB: 1933.01.01\nHEIGHT: 176cm\nWEIGHT: 71kg\nEXP: 1983.09.20',
      };
      const entrant_tests = [
        [josef, 'Josef Costanza', 'Glory to Arstotzka.'],
        [guyovich, 'Russian Guyovich', 'Entry denied: missing required passport.'],
        [roman, 'Roman Dolanski', 'Detainment: ID number mismatch.'],
      ];

      expect(inspector.inspect(josef)).to.equal('Glory to Arstotzka.');
      expect(inspector.inspect(guyovich)).to.equal(entrant_tests[1][2]);
      expect(inspector.inspect(roman)).to.equal(entrant_tests[2][2]);
    });

    it('nation denied', () => {
      const inspector = new Inspector();
      let bulletin =
        'Entrants require passport\nAllow citizens of Arstotzka\nWanted by the State: Jonathan Reyes\nWanted by the State: Lorena Harkonnen';
      bulletin += '\nWanted by the State: Ekaterina Strauss';
      inspector.receiveBulletin(bulletin);

      const josef = {
        passport: 'ID#: GVM9G-DLV61\nNATION: Kolechia\nNAME: Leonov, Eduardo\nDOB: 1926.08.02\nSEX: M\nISS: Vedor\nEXP: 1983.06.28',
      };

      const josef2 = {
        passport: 'ID#: GVM9G-DLV61\nNATION: Arstotzka\nNAME: Leonov, Eduardo\nDOB: 1926.08.02\nSEX: M\nISS: Vedor\nEXP: 1981.10.09',
      };

      const josef3 = {
        passport: 'ID#: IK7XV-XOC7Z\nNATION: Arstotzka\nNAME: Reyes, Jonathan\nDOB: 1939.09.14\nSEX: M\nISS: Glorian\nEXP: 1983.07.21',
      };

      const josef4 = {
        passport: 'ID#: NOO5G-JV18E\nNATION: Republia\nNAME: Harkonnen, Lorena\nDOB: 1935.07.11\nSEX: F\nISS: Lesrenadi\nEXP: 1984.05.02',
      };

      expect(inspector.inspect(josef)).to.equal('Entry denied: citizen of banned nation.');
      expect(inspector.inspect(josef2)).to.equal('Entry denied: passport expired.');
      expect(inspector.inspect(josef3)).to.equal('Detainment: Entrant is a wanted criminal.');
      expect(inspector.inspect(josef4)).to.equal('Detainment: Entrant is a wanted criminal.');
    });

    it('test 1', () => {
      f(
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Marina Zyrus',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Ingrid Bennet',
        ],
        {
          passport: 'ID#: ZFPU9-QRIV9\nNATION: Impor\nNAME: Bennet, Ingrid\nDOB: 1960.05.07\nSEX: F\nISS: Tsunkeido\nEXP: 1981.01.01',
        },
        'Detainment: Entrant is a wanted criminal.'
      );
    });
    it('diplomatic_authorization', () => {
      f(
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Martin Dimitrov',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Aidan Novak',
          'Foreigners require access permit',
          'Wanted by the State: Anna Latva',
        ],
        {
          passport:
            'ID#: XM3S1-DDMK1\nNATION: United Federation\nNAME: Vincenza, Aleksandra\nDOB: 1940.03.08\nSEX: F\nISS: Korista City\nEXP: 1983.02.05',
          diplomatic_authorization: 'NATION: United Federation\nNAME: Vincenza, Aleksandra\nID#: XM3S1-DDMK1\nACCESS: Obristan',
        },
        'Entry denied: invalid diplomatic authorization.'
      );
    });

    it('access_permit', () => {
      f(
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Amalie Levine',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Lorena Khan',
          'Foreigners require access permit',
          'Wanted by the State: Karina David',
        ],
        {
          passport: 'ID#: MLG3B-X9SOR\nNATION: Impor\nNAME: Yankov, Olga\nDOB: 1933.07.08\nSEX: F\nISS: Tsunkeido\nEXP: 1984.02.15',
        },
        'Entry denied: missing required access permit.'
      );

      f(
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Gabrielle Medici',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Marcel Ramos',
          'Foreigners require access permit',
          'Wanted by the State: Michaela Zajak',
        ],
        {
          passport: 'ID#: K8J9U-DO7W5\nNATION: Republia\nNAME: Borshiki, Olec\nDOB: 1944.08.07\nSEX: M\nISS: True Glorian\nEXP: 1985.11.22',
          access_permit:
            'NAME: Borshiki, Olec\nNATION: Republia\nID#: K8J9U-DO7W5\nPURPOSE: WORK\nDURATION: 3 MONTHS\nHEIGHT: 149cm\nWEIGHT: 45kg\nEXP: 1985.07.09',
          work_pass: 'NAME: Borshiki, Olec\nFIELD: Fishing\nEXP: 1984.09.28',
        },
        `Cause no trouble.`
      );
      f(
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Svetlana Tolaj',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Nina Zeitsoff',
          'Foreigners require access permit',
          'Wanted by the State: Ahmad Reyes',
          'Citizens of Arstotzka require ID card',
          'Deny citizens of United Federation',
          'Wanted by the State: Stanislav Andrevska',
        ],
        {
          passport: 'ID#: L1HL5-J4VHJ\nNATION: Obristan\nNAME: Watson, Vasily\nDOB: 1933.06.06\nSEX: M\nISS: Mergerous\nEXP: 1982.12.28',
          grant_of_asylum:
            'NAME: Watson, Vasily\nNATION: Obristan\nID#: L1HL5-J4VHJ\nDOB: 1933.06.06\nHEIGHT: 189cm\nWEIGHT: 104kg\nEXP: 1985.10.09',
        },
        `Cause no trouble.`
      );
    });

    it('order error document', () => {
      f(
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Mikhail Weiss',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Nadia Spektor',
          'Foreigners require access permit',
          'Wanted by the State: Elena Klass',
        ],
        {
          passport:
            'ID#: DEK80-GGK81\nNATION: Republia\nNAME: Burke, Stanislav\nDOB: 1920.03.18\nSEX: M\nISS: True Glorian\nEXP: 1981.11.11',
          access_permit:
            'NAME: Burke, Stanislav\nNATION: Republia\nID#: LOT77-ZPL51\nPURPOSE: WORK\nDURATION: 6 MONTHS\nHEIGHT: 181cm\nWEIGHT: 93kg\nEXP: 1983.12.27',
          work_pass: 'NAME: Burke, Stanislav\nFIELD: Dentistry\nEXP: 1982.12.30',
        },
        `Detainment: ID number mismatch.`
      );
    });

    it('vaccine', () => {
      f(
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Katrina Crechiolo',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Sarah Kerr',
          'Foreigners require access permit',
          'Wanted by the State: Ahmad Burke',
          'Citizens of Arstotzka require ID card',
          'Deny citizens of Antegria',
          'Wanted by the State: Ivana Xavier',
          'Allow citizens of Antegria',
          'Deny citizens of Kolechia',
          'Wanted by the State: Mohammed Gregorovich',
          'Allow citizens of Kolechia',
          'Deny citizens of United Federation',
          'Citizens of Obristan, Antegria, Impor, Republia require cowpox vaccination',
          'Wanted by the State: Ivan Jacobs',
          'Allow citizens of United Federation',
          'Deny citizens of Obristan',
          'Wanted by the State: Gregory Lindberg',
        ],
        {
          passport: 'ID#: EF69H-MFV7F\nNATION: Impor\nNAME: Kravitz, Sven\nDOB: 1937.02.08\nSEX: M\nISS: Tsunkeido\nEXP: 1984.05.11',
          access_permit:
            'NAME: Kravitz, Sven\nNATION: Impor\nID#: EF69H-MFV7F\nPURPOSE: WORK\nDURATION: 1 MONTH\nHEIGHT: 185cm\nWEIGHT: 98kg\nEXP: 1984.07.13',
          work_pass: 'NAME: Kravitz, Sven\nFIELD: Surveying\nEXP: 1985.11.17',
        },
        `Entry denied: missing required certificate of vaccination.`
      );

      f(
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Brenna Romanov',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Kristofer Fischer',
          'Foreigners require access permit',
          'Wanted by the State: Ivanka Harkonnen',
          'Citizens of Arstotzka require ID card',
          'Deny citizens of Impor',
          'Wanted by the State: Kristof Steinberg',
          'Allow citizens of Impor',
          'Deny citizens of Kolechia',
          'Wanted by the State: Vanessa Costanzo',
          'Allow citizens of Kolechia',
          'Deny citizens of Impor',
          'Citizens of Obristan, Antegria require measles vaccination',
          'Workers require work pass',
          'Wanted by the State: Nikolai Borshiki',
        ],
        {
          passport: 'ID#: FNP84-S2JCD\nNATION: Arstotzka\nNAME: Ortiz, Katherine\nDOB: 1951.12.13\nSEX: F\nISS: Paradizna\nEXP: 1982.12.25',
          ID_card: 'NAME: Ortiz, Katherine\nDOB: 1951.12.13\nHEIGHT: 159cm\nWEIGHT: 61kg',
        },
        `Glory to Arstotzka.`
      );
    });
  });
});

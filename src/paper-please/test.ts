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
      'Citizens of Kolechia, Obristan require cholera vaccination',
      'Citizens of Kolechia, Obristan no longer require cholera vaccination',
      'Citizens of Antegria, Impor, Republia, Obristan require cowpox vaccination',
      'Foreigners require yellow fever vaccination',
      'Citizens of Antegria, Impor, Republia, Obristan require cowpox vaccination',
      'Entrants require HPV vaccination',
    ];
    setup(new VaccinationManager(), vaccinationBulletins[0], {
      polio: ['Antegria', 'Republia', 'Obristan'],
    });
    setup(new VaccinationManager(), vaccinationBulletins[1], { tetanus: [] });

    setup(new VaccinationManager(), vaccinationBulletins[2], {
      cholera: ['Kolechia', 'Obristan'],
    });

    setup(new VaccinationManager(), vaccinationBulletins[3], {
      cholera: [],
    });

    setup(new VaccinationManager(), vaccinationBulletins[4], {
      cowpox: ['Antegria', 'Impor', 'Republia', 'Obristan'],
    });

    setup(new VaccinationManager(), vaccinationBulletins[5], {
      'yellow fever': ['Antegria', 'Impor', 'Kolechia', 'Obristan', 'Republia', 'United Federation'],
    });

    setup(new VaccinationManager(), vaccinationBulletins[6], {
      cowpox: ['Antegria', 'Impor', 'Republia', 'Obristan'],
    });

    setup(new VaccinationManager(), vaccinationBulletins[7], {
      HPV: ['Arstotzka', 'Antegria', 'Impor', 'Kolechia', 'Obristan', 'Republia', 'United Federation'],
    });

    expect(
      new VaccinationManager()
        .add('Citizens of Kolechia, Obristan require cholera vaccination')
        .add('Citizens of Kolechia, Obristan no longer require cholera vaccination')
        .serialize()
    ).to.equal(stringify({ cholera: [] }));
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
    function f(entrants: Record<string, string>, bulletins: string[], expected: string) {
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
        {
          passport: 'ID#: ZFPU9-QRIV9\nNATION: Impor\nNAME: Bennet, Ingrid\nDOB: 1960.05.07\nSEX: F\nISS: Tsunkeido\nEXP: 1981.01.01',
        },
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Marina Zyrus',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Ingrid Bennet',
        ],
        'Detainment: Entrant is a wanted criminal.'
      );
    });
    it('diplomatic_authorization', () => {
      f(
        {
          passport:
            'ID#: XM3S1-DDMK1\nNATION: United Federation\nNAME: Vincenza, Aleksandra\nDOB: 1940.03.08\nSEX: F\nISS: Korista City\nEXP: 1983.02.05',
          diplomatic_authorization: 'NATION: United Federation\nNAME: Vincenza, Aleksandra\nID#: XM3S1-DDMK1\nACCESS: Obristan',
        },
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Martin Dimitrov',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Aidan Novak',
          'Foreigners require access permit',
          'Wanted by the State: Anna Latva',
        ],
        'Entry denied: invalid diplomatic authorization.'
      );
    });

    it('access_permit', () => {
      f(
        {
          passport: 'ID#: MLG3B-X9SOR\nNATION: Impor\nNAME: Yankov, Olga\nDOB: 1933.07.08\nSEX: F\nISS: Tsunkeido\nEXP: 1984.02.15',
        },
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Amalie Levine',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Lorena Khan',
          'Foreigners require access permit',
          'Wanted by the State: Karina David',
        ],
        'Entry denied: missing required access permit.'
      );

      f(
        {
          passport: 'ID#: K8J9U-DO7W5\nNATION: Republia\nNAME: Borshiki, Olec\nDOB: 1944.08.07\nSEX: M\nISS: True Glorian\nEXP: 1985.11.22',
          access_permit:
            'NAME: Borshiki, Olec\nNATION: Republia\nID#: K8J9U-DO7W5\nPURPOSE: WORK\nDURATION: 3 MONTHS\nHEIGHT: 149cm\nWEIGHT: 45kg\nEXP: 1985.07.09',
          work_pass: 'NAME: Borshiki, Olec\nFIELD: Fishing\nEXP: 1984.09.28',
        },
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Gabrielle Medici',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Marcel Ramos',
          'Foreigners require access permit',
          'Wanted by the State: Michaela Zajak',
        ],
        `Cause no trouble.`
      );
      f(
        {
          passport: 'ID#: L1HL5-J4VHJ\nNATION: Obristan\nNAME: Watson, Vasily\nDOB: 1933.06.06\nSEX: M\nISS: Mergerous\nEXP: 1982.12.28',
          grant_of_asylum:
            'NAME: Watson, Vasily\nNATION: Obristan\nID#: L1HL5-J4VHJ\nDOB: 1933.06.06\nHEIGHT: 189cm\nWEIGHT: 104kg\nEXP: 1985.10.09',
        },
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
        `Cause no trouble.`
      );
    });

    it('order error document', () => {
      f(
        {
          passport:
            'ID#: DEK80-GGK81\nNATION: Republia\nNAME: Burke, Stanislav\nDOB: 1920.03.18\nSEX: M\nISS: True Glorian\nEXP: 1981.11.11',
          access_permit:
            'NAME: Burke, Stanislav\nNATION: Republia\nID#: LOT77-ZPL51\nPURPOSE: WORK\nDURATION: 6 MONTHS\nHEIGHT: 181cm\nWEIGHT: 93kg\nEXP: 1983.12.27',
          work_pass: 'NAME: Burke, Stanislav\nFIELD: Dentistry\nEXP: 1982.12.30',
        },
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Mikhail Weiss',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Nadia Spektor',
          'Foreigners require access permit',
          'Wanted by the State: Elena Klass',
        ],
        `Detainment: ID number mismatch.`
      );
    });

    it('vaccine', () => {
      f(
        {
          passport: 'ID#: EF69H-MFV7F\nNATION: Impor\nNAME: Kravitz, Sven\nDOB: 1937.02.08\nSEX: M\nISS: Tsunkeido\nEXP: 1984.05.11',
          access_permit:
            'NAME: Kravitz, Sven\nNATION: Impor\nID#: EF69H-MFV7F\nPURPOSE: WORK\nDURATION: 1 MONTH\nHEIGHT: 185cm\nWEIGHT: 98kg\nEXP: 1984.07.13',
          work_pass: 'NAME: Kravitz, Sven\nFIELD: Surveying\nEXP: 1985.11.17',
        },
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
        `Entry denied: missing required certificate of vaccination.`
      );

      f(
        {
          passport: 'ID#: FNP84-S2JCD\nNATION: Arstotzka\nNAME: Ortiz, Katherine\nDOB: 1951.12.13\nSEX: F\nISS: Paradizna\nEXP: 1982.12.25',
          ID_card: 'NAME: Ortiz, Katherine\nDOB: 1951.12.13\nHEIGHT: 159cm\nWEIGHT: 61kg',
        },
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
        `Glory to Arstotzka.`
      );

      f(
        {
          passport: 'ID#: YES87-HP4U8\nNATION: Impor\nNAME: Latva, Wilma\nDOB: 1916.10.17\nSEX: F\nISS: Enkyo\nEXP: 1985.05.24',
          access_permit:
            'NAME: Latva, Wilma\nNATION: Impor\nID#: YES87-HP4U8\nPURPOSE: VISIT\nDURATION: 14 DAYS\nHEIGHT: 145cm\nWEIGHT: 40kg\nEXP: 1983.12.25',
          certificate_of_vaccination: 'NAME: Latva, Wilma\nID#: YES87-HP4U8\nVACCINES: cholera, HPV, rubella',
        },
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Alek Hertzog',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Galina Dvorkin',
          'Foreigners require access permit',
          'Wanted by the State: Yvonna Mateo',
          'Citizens of Arstotzka require ID card',
          'Deny citizens of Obristan',
          'Wanted by the State: Lazlo Klaus',
          'Allow citizens of Obristan',
          'Deny citizens of United Federation',
          'Wanted by the State: Josefina Jensen',
          'Allow citizens of United Federation',
          'Deny citizens of Republia',
          'Citizens of Republia, Kolechia require typhus vaccination',
          'Workers require work pass',
          'Wanted by the State: Vilhelm Kierkgaard',
          'Allow citizens of Republia',
          'Deny citizens of Obristan',
          'Wanted by the State: Aron Khan',
          'Allow citizens of Obristan',
          'Deny citizens of Kolechia',
          'Wanted by the State: Mikkel Novak',
          'Allow citizens of Kolechia',
          'Deny citizens of Impor',
          'Citizens of Republia, Kolechia no longer require typhus vaccination',
          'Citizens of Republia, Impor require tetanus vaccination',
          'Wanted by the State: Gabriela Karlsson',
          'Allow citizens of Impor',
          'Deny citizens of Republia',
          'Wanted by the State: Jessica Kaczynska',
        ],
        `Entry denied: missing required vaccination.`
      );
    });

    it('vaccines 2', () => {
      f(
        {
          passport: 'ID#: TXT68-L9J6M\nNATION: Impor\nNAME: Frank, Vadim\nDOB: 1941.02.18\nSEX: M\nISS: Tsunkeido\nEXP: 1984.01.27',
          grant_of_asylum:
            'NAME: Frank, Vadim\nNATION: Impor\nID#: TXT68-L9J6M\nDOB: 1941.02.18\nHEIGHT: 162cm\nWEIGHT: 64kg\nEXP: 1985.03.05',
        },
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: Yulia Levine',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Ava Quinn',
          'Foreigners require access permit',
          'Wanted by the State: Vadim Strauss',
          'Citizens of Arstotzka require ID card',
          'Deny citizens of Impor',
          'Wanted by the State: Gustav Vincenza',
          'Allow citizens of Impor',
          'Deny citizens of Kolechia',
          'Wanted by the State: Adam Owsianka',
          'Allow citizens of Kolechia',
          'Deny citizens of Impor',
          'Citizens of Kolechia, Obristan require cholera vaccination',
          'Wanted by the State: Mathias Pearl',
          'Allow citizens of Impor',
          'Deny citizens of Republia',
          'Wanted by the State: Roman Zitna',
          'Allow citizens of Republia',
          'Deny citizens of Obristan',
          'Citizens of Kolechia, Obristan no longer require cholera vaccination',
          'Citizens of Antegria, Impor, Republia, Obristan require cowpox vaccination',
          'Wanted by the State: Artour Popovic',
          'Allow citizens of Obristan',
          'Deny citizens of Impor',
          'Wanted by the State: Sergei Olah',
          'Allow citizens of Impor',
          'Deny citizens of Obristan',
          'Wanted by the State: Mila Gregorovich',
          'Allow citizens of Obristan',
          'Deny citizens of Kolechia',
          'Workers require work pass',
          'Wanted by the State: Tomas Anderson',
          'Allow citizens of Kolechia',
          'Deny citizens of Republia',
          'Citizens of Antegria, Impor, Republia, Obristan no longer require cowpox vaccination',
          'Foreigners require yellow fever vaccination',
          'Wanted by the State: Lorena Lukowski',
        ],
        `Entry denied: missing required certificate of vaccination.`
      );
    });

    it('vaccines 3', () => {
      f(
        {
          passport:
            'ID#: V7IA9-GJ90B\nNATION: Antegria\nNAME: Kierkgaard, Sarah\nDOB: 1948.07.26\nSEX: F\nISS: St. Marmero\nEXP: 1985.12.05',
          grant_of_asylum:
            'NAME: Kierkgaard, Sarah\nNATION: Antegria\nID#: V7IA9-GJ90B\nDOB: 1948.07.26\nHEIGHT: 151cm\nWEIGHT: 49kg\nEXP: 1985.02.12',
        },
        [
          'Entrants require passport',
          'Allow citizens of Arstotzka',
          'Wanted by the State: James Costa',
          'Allow citizens of Antegria, Impor, Kolechia, Obristan, Republia, United Federation',
          'Wanted by the State: Ana Costanzo',
          'Foreigners require access permit',
          'Wanted by the State: Mila Malkova',
          'Citizens of Arstotzka require ID card',
          'Deny citizens of Kolechia',
          'Wanted by the State: Beatrix Reyes',
          'Allow citizens of Kolechia',
          'Deny citizens of Obristan',
          'Wanted by the State: Jan Karlsson',
          'Allow citizens of Obristan',
          'Deny citizens of Antegria',
          'Foreigners require yellow fever vaccination',
          'Wanted by the State: Ivana Frederikson',
          'Allow citizens of Antegria',
          'Deny citizens of Republia',
          'Wanted by the State: Beatrix Harkonnen',
          'Allow citizens of Republia',
          'Deny citizens of Antegria',
          'Wanted by the State: Kascha DeGraff',
          'Allow citizens of Antegria',
          'Deny citizens of Kolechia',
          'Foreigners no longer require yellow fever vaccination',
          'Entrants require HPV vaccination',
          'Wanted by the State: Andre Grech',
        ],
        `Entry denied: missing required certificate of vaccination.`
      );
    });
  });
});

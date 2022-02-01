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
      new EntrantDocuments().add(
        'passport',
        'ID#: VZP61-BAY82\nNATION: Kolechia\nNAME: Kovacs, Brenna\nDOB: 1921.09.14\nSEX: F\nISS: Yurko City\nEXP: 1981.11.03'
      ).errors
    ).deep.equal(['passport expired']);
  });

  describe('main', () => {
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
  });
});

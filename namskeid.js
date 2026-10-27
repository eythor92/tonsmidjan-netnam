// Námskeiðaskrá netnámsins. Allar síður lesa námskeiðin héðan,
// svo það þarf bara að breyta á einum stað.
//
// Hvert námskeið er 4 vikur: vikur 1–3 eru æfingar, vika 4 er „Lagið þitt“.
// status: 'opid' = opið fyrir skráningu, 'vaentanlegt' = í vinnslu.

window.TSN = {
  LEVELS: [
    { id: 'grunnur', name: 'Grunnur',       short: 'Fyrir algjöra byrjendur',             fit: 'Ég hef aldrei spilað á píanó' },
    { id: 'audvelt', name: 'Auðvelt',       short: 'Þú kannt fyrstu nóturnar',            fit: 'Ég kann nokkur einföld lög með hægri hendi' },
    { id: 'midlungs', name: 'Miðlungs',     short: 'Þú spilar með báðum höndum',          fit: 'Ég spila með báðum höndum og kann hljóma' },
    { id: 'lengra',  name: 'Lengra komnir', short: 'Þú vilt meiri áskorun',               fit: 'Ég spila reglulega og vil læra meira' },
  ],

  COURSES: [
    // Grunnur
    { id: 'fyrstu-skrefin', level: 0, status: 'opid', free: true,
      title: 'Fyrstu skrefin', desc: 'Hljómborðið, setstaða og fyrstu nóturnar með báðum höndum.',
      weeks: ['Að kynnast hljómborðinu', 'Fimm fingra staða', 'Báðar hendur saman'] },
    { id: 'notnalestur', level: 0, status: 'opid',
      title: 'Nótnalestur frá grunni', desc: 'Lærðu að lesa nótur af blaði, skref fyrir skref.',
      weeks: ['G-lykillinn', 'F-lykillinn', 'Taktur og nótnagildi'] },
    { id: 'fingrasetning', level: 0, status: 'opid',
      title: 'Fingrasetning og fingraæfingar', desc: 'Sterkir, jafnir og sjálfstæðir fingur frá byrjun.',
      weeks: ['Fingranúmer og handstaða', 'Sjálfstæði fingra', 'Létt og jafnt spil'] },

    // Auðvelt
    { id: 'fyrstu-hljomarnir', level: 1, status: 'opid',
      title: 'Fyrstu hljómarnir', desc: 'Grunnhljómarnir sem eru í nánast öllum popplögum.',
      weeks: ['C, F og G', 'Am og Em', 'Að skipta á milli hljóma'] },
    { id: 'einfaldir-tonstigar', level: 1, status: 'opid',
      title: 'Einfaldir tónstigar', desc: 'Dúr-tónstigar með réttri fingrasetningu.',
      weeks: ['C-dúr', 'G-dúr og F-dúr', 'Þumall undir'] },
    { id: 'popp-undirleikur', level: 1, status: 'vaentanlegt',
      title: 'Popp-undirleikur', desc: 'Hljómar í vinstri, laglína í hægri. Spilaðu eftir hljómatáknum.',
      weeks: ['Hljómar í vinstri hendi', 'Laglína og hljómar saman', 'Að spila eftir hljómatáknum'] },
    { id: 'taktur', level: 1, status: 'vaentanlegt',
      title: 'Taktur og hrynur', desc: 'Fáðu lögin til að „grúva“ með einföldum hrynmynstrum.',
      weeks: ['Áttundapartar', 'Hrynmynstur í vinstri hendi', 'Að spila með taktmæli'] },

    // Miðlungs
    { id: 'tonstigar-og-arpeggiur', level: 2, status: 'vaentanlegt',
      title: 'Tónstigar og brotnir hljómar', desc: 'Moll-tónstigar, arpeggíur og meiri hraði.',
      weeks: ['Moll-tónstigar', 'Brotnir hljómar', 'Hraði og jafnvægi'] },
    { id: 'hljomahvorf', level: 2, status: 'vaentanlegt',
      title: 'Hljómahvörf og mjúk skipti', desc: 'Láttu hljómaskiptin renna saman eins og hjá atvinnufólki.',
      weeks: ['Hljómahvörf', 'Raddfærsla', 'Hljómagangar í popplögum'] },
    { id: 'eftir-eyranu', level: 2, status: 'vaentanlegt',
      title: 'Að spila eftir eyranu', desc: 'Finndu laglínuna og hljómana sjálf(ur), án nótna.',
      weeks: ['Að finna laglínuna', 'Að finna hljómana', 'Þitt eigið undirspil'] },
    { id: 'pedall-og-tjaning', level: 2, status: 'vaentanlegt',
      title: 'Pedall og tjáning', desc: 'Pedall, styrkleikabreytingar og túlkun.',
      weeks: ['Pedalnotkun', 'Styrkleikabreytingar', 'Túlkun og tilfinning'] },

    // Lengra komnir
    { id: 'djass-og-popphljomar', level: 3, status: 'vaentanlegt',
      title: 'Djass- og popphljómar', desc: 'Sjöundir, níundir og hljómar sem gefa lögunum lit.',
      weeks: ['Sjöundarhljómar', 'Níundir og útvíkkanir', 'Hljómagangar í djassi'] },
    { id: 'spuni', level: 3, status: 'vaentanlegt',
      title: 'Spuni', desc: 'Spinna yfir hljómagang með blústónstiganum og meira til.',
      weeks: ['Blústónstiginn', 'Að spinna yfir hljómagang', 'Spuni í eigin lagi'] },
    { id: 'taekni', level: 3, status: 'vaentanlegt',
      title: 'Tækni og flóknar fingrasetningar', desc: 'Hraði, nákvæmni og sjálfstæði handa.',
      weeks: ['Hraði og nákvæmni', 'Sjálfstæði handa', 'Flókin hrynmynstur'] },
    { id: 'utsetning', level: 3, status: 'vaentanlegt',
      title: 'Þín eigin útsetning', desc: 'Taktu uppáhaldslagið þitt og gerðu það að þínu.',
      weeks: ['Að greina lagið', 'Að útsetja fyrir píanó', 'Fínpússun'] },
  ],

  SONG_WEEK: 'Lagið þitt',
};

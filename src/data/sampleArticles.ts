import type { Article } from '../types';

export const SAMPLE_ARTICLES: Article[] = [
  {
    id: 'steve-jobs-stanford',
    title: 'How to Live Before You Die (Stanford Speech)',
    category: 'Inspiration',
    author: 'Steve Jobs',
    annotations: [
      { id: '1', phrase: 'connect the dots', meaning: 'Kết nối những trải nghiệm trong quá khứ để hiểu được tương lai', type: 'idiom' },
      { id: '2', phrase: 'clear out the old', meaning: 'Loại bỏ những cái cũ kỹ để nhường chỗ cho cái mới', type: 'collocation' },
      { id: '3', phrase: 'stay hungry, stay foolish', meaning: 'Luôn khao khát học hỏi và không ngại thử thách táo bạo', type: 'idiom' }
    ],
    sentences: [
      { id: 's1', text: 'You can\'t connect the dots looking forward; you can only connect them looking backwards.', order: 0, highlightPhrases: ['connect the dots'] },
      { id: 's2', text: 'So you have to trust that the dots will somehow connect in your future.', order: 1, highlightPhrases: ['connect in your future'] },
      { id: 's3', text: 'You have to trust in something: your gut, destiny, life, karma, whatever.', order: 2, highlightPhrases: ['your gut'] },
      { id: 's4', text: 'Your time is limited, so don\'t waste it living someone else\'s life.', order: 3, highlightPhrases: ['waste it living'] },
      { id: 's5', text: 'Don\'t let the noise of others\' opinions drown out your own inner voice.', order: 4, highlightPhrases: ['drown out'] },
      { id: 's6', text: 'And most importantly, have the courage to follow your heart and intuition.', order: 5, highlightPhrases: ['follow your heart'] },
      { id: 's7', text: 'Stay Hungry. Stay Foolish.', order: 6, highlightPhrases: ['stay hungry, stay foolish'] }
    ],
    paragraphs: [
      {
        id: 'p1',
        text: 'You can\'t connect the dots looking forward; you can only connect them looking backwards. So you have to trust that the dots will somehow connect in your future. You have to trust in something: your gut, destiny, life, karma, whatever. This approach has never let me down, and it has made all the difference in my life.',
        order: 0,
        highlightPhrases: ['connect the dots', 'never let me down']
      },
      {
        id: 'p2',
        text: 'Your time is limited, so don\'t waste it living someone else\'s life. Don\'t be trapped by dogma — which is living with the results of other people\'s thinking. Don\'t let the noise of others\' opinions drown out your own inner voice. And most importantly, have the courage to follow your heart and intuition. They somehow already know what you truly want to become.',
        order: 1,
        highlightPhrases: ['trapped by dogma', 'drown out']
      },
      {
        id: 'p3',
        text: 'Death is very likely the single best invention of Life. It is Life\'s change agent. It clears out the old to make way for the new. Right now the new is you, but someday not too long from now, you will gradually become the old and be cleared away. Sorry to be so dramatic, but it is quite true. Stay Hungry. Stay Foolish.',
        order: 2,
        highlightPhrases: ['clear out the old', 'stay hungry, stay foolish']
      }
    ]
  },
  {
    id: 'ted-power-of-vulnerability',
    title: 'The Power of Vulnerability',
    category: 'TED Talks',
    author: 'Brené Brown',
    annotations: [
      { id: '4', phrase: 'lean into the discomfort', meaning: 'Chấp nhận và đối diện với cảm giác khó chịu thay vì né tránh', type: 'idiom' },
      { id: '5', phrase: 'wholehearted', meaning: 'Toàn tâm toàn ý, sống bằng cả trái tim', type: 'vocab' }
    ],
    sentences: [
      { id: 'bv1', text: 'Vulnerability is not winning or losing; it\'s having the courage to show up when you can\'t control the outcome.', order: 0, highlightPhrases: ['courage to show up'] },
      { id: 'bv2', text: 'In order for connection to happen, we have to allow ourselves to be seen, really seen.', order: 1, highlightPhrases: ['really seen'] },
      { id: 'bv3', text: 'They fully embraced vulnerability, believing that what made them vulnerable made them beautiful.', order: 2, highlightPhrases: ['embraced vulnerability'] }
    ],
    paragraphs: [
      {
        id: 'bp1',
        text: 'Vulnerability is not winning or losing; it\'s having the courage to show up and be seen when you can\'t control the outcome. In our culture of scarcity and shame, leaning into vulnerability is the only path to belonging, joy, and meaningful human connection.',
        order: 0,
        highlightPhrases: ['courage to show up', 'leaning into vulnerability']
      }
    ]
  }
];

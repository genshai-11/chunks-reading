/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { ReadingResource, ResourceStatus, SourceType, PhraseAnnotation } from '../types';
import { segmentSentences, segmentParagraphs } from '../utils/textSegmentation';
import { detectAllPhrasesForResource } from './phraseDetection';

const COLLECTION_NAME = 'resources';

export const SEEDED_DEFAULT_RESOURCES: Omit<ReadingResource, 'ownerId' | 'id'>[] = [
  // 1. Steve Jobs: Stanford 2005 (Complete 3 Stories)
  {
    title: 'Steve Jobs: Stay Hungry, Stay Foolish (Stanford 2005)',
    category: 'Inspirational Speeches',
    topic: 'Life Choices, Love, Loss, Mortality',
    level: 'B2 Upper-Intermediate',
    sourceType: 'seeded',
    provenance: 'Stanford University Commencement Address (June 12, 2005)',
    rightsBasis: 'Public Historical Speech',
    status: 'published',
    canonicalText:
      'I am honored to be with you today at your commencement from one of the finest universities in the world. Truth be told, I never graduated from college. Today I want to tell you three stories from my life. That is it. No big deal. Just three stories.\n\nThe first story is about connecting the dots. I dropped out of Reed College after the first six months, but then stayed around as a drop-in for another 18 months before I really quit. So why did I drop out? It started before I was born. My biological mother was a young, unwed college graduate student, and she decided to put me up for adoption.\n\nI decided to take a calligraphy class to learn how to do this. I learned about serif and sans serif typefaces, about varying the amount of space between different letter combinations, about what makes great typography great. None of this had even a hope of any practical application in my life. But ten years later, when we were designing the first Macintosh computer, it all came back to me. And we designed it all into the Mac. If I had never dropped out, I would have never dropped in on that calligraphy class, and personal computers might not have the wonderful typography that they do. You cannot connect the dots looking forward; you can only connect them looking backwards. So you have to trust that the dots will somehow connect in your future.\n\nMy second story is about love and loss. I was lucky. I found what I loved to do early in life. Woz and I started Apple in my parents garage when I was 20. In 10 years Apple had grown from just the two of us into a 2 billion dollar company with over 4000 employees. We had just released our finest creation, the Macintosh, and then I got fired. How can you get fired from a company you started? Well, as Apple grew we hired someone who I thought was very talented to run the company with me, but our visions began to diverge and eventually our Board of Directors sided with him. So at 30 I was out. What had been the focus of my entire adult life was gone, and it was devastating.\n\nI did not see it then, but it turned out that getting fired from Apple was the best thing that could have ever happened to me. The heaviness of being successful was replaced by the lightness of being a beginner again. It freed me to enter one of the most creative periods of my life. During the next five years, I started a company named NeXT, another company named Pixar, and fell in love with an amazing woman who would become my wife. In a remarkable turn of events, Apple bought NeXT, I returned to Apple, and the technology we developed at NeXT is at the heart of Apple current renaissance.\n\nMy third story is about death. When I was 17, I read a quote that went something like: If you live each day as if it was your last, someday you will most certainly be right. It made an impression on me, and since then, for the past 33 years, I have looked in the mirror every morning and asked myself: If today were the last day of my life, would I want to do what I am about to do today? And whenever the answer has been No for too many days in a row, I know I need to change something.\n\nRemembering that you are going to die is the best way I know to avoid the trap of thinking you have something to lose. You are already naked. There is no reason not to follow your heart. Your time is limited, so do not waste it living someone else life. Do not be trapped by dogma, which is living with the results of other people thinking. Do not let the noise of others opinions drown out your own inner voice. And most important, have the courage to follow your heart and intuition. Stay Hungry. Stay Foolish.',
    sentences: [
      'I am honored to be with you today at your commencement from one of the finest universities in the world.',
      'Truth be told, I never graduated from college.',
      'Today I want to tell you three stories from my life.',
      'That is it.',
      'No big deal.',
      'Just three stories.',
      'The first story is about connecting the dots.',
      'I dropped out of Reed College after the first six months, but then stayed around as a drop-in for another 18 months before I really quit.',
      'So why did I drop out?',
      'It started before I was born.',
      'My biological mother was a young, unwed college graduate student, and she decided to put me up for adoption.',
      'I decided to take a calligraphy class to learn how to do this.',
      'I learned about serif and sans serif typefaces, about varying the amount of space between different letter combinations, about what makes great typography great.',
      'None of this had even a hope of any practical application in my life.',
      'But ten years later, when we were designing the first Macintosh computer, it all came back to me.',
      'And we designed it all into the Mac.',
      'If I had never dropped out, I would have never dropped in on that calligraphy class, and personal computers might not have the wonderful typography that they do.',
      'You cannot connect the dots looking forward; you can only connect them looking backwards.',
      'So you have to trust that the dots will somehow connect in your future.',
      'My second story is about love and loss.',
      'I was lucky.',
      'I found what I loved to do early in life.',
      'Woz and I started Apple in my parents garage when I was 20.',
      'In 10 years Apple had grown from just the two of us into a 2 billion dollar company with over 4000 employees.',
      'We had just released our finest creation, the Macintosh, and then I got fired.',
      'How can you get fired from a company you started?',
      'Well, as Apple grew we hired someone who I thought was very talented to run the company with me, but our visions began to diverge and eventually our Board of Directors sided with him.',
      'So at 30 I was out.',
      'What had been the focus of my entire adult life was gone, and it was devastating.',
      'I did not see it then, but it turned out that getting fired from Apple was the best thing that could have ever happened to me.',
      'The heaviness of being successful was replaced by the lightness of being a beginner again.',
      'It freed me to enter one of the most creative periods of my life.',
      'During the next five years, I started a company named NeXT, another company named Pixar, and fell in love with an amazing woman who would become my wife.',
      'In a remarkable turn of events, Apple bought NeXT, I returned to Apple, and the technology we developed at NeXT is at the heart of Apple current renaissance.',
      'My third story is about death.',
      'When I was 17, I read a quote that went something like: If you live each day as if it was your last, someday you will most certainly be right.',
      'It made an impression on me, and since then, for the past 33 years, I have looked in the mirror every morning and asked myself: If today were the last day of my life, would I want to do what I am about to do today?',
      'And whenever the answer has been No for too many days in a row, I know I need to change something.',
      'Remembering that you are going to die is the best way I know to avoid the trap of thinking you have something to lose.',
      'You are already naked.',
      'There is no reason not to follow your heart.',
      'Your time is limited, so do not waste it living someone else life.',
      'Do not be trapped by dogma, which is living with the results of other people thinking.',
      'Do not let the noise of others opinions drown out your own inner voice.',
      'And most important, have the courage to follow your heart and intuition.',
      'Stay Hungry.',
      'Stay Foolish.'
    ],
    paragraphs: [
      'I am honored to be with you today at your commencement from one of the finest universities in the world. Truth be told, I never graduated from college. Today I want to tell you three stories from my life. That is it. No big deal. Just three stories.',
      'The first story is about connecting the dots. I dropped out of Reed College after the first six months, but then stayed around as a drop-in for another 18 months before I really quit. So why did I drop out? It started before I was born. My biological mother was a young, unwed college graduate student, and she decided to put me up for adoption.',
      'I decided to take a calligraphy class to learn how to do this. I learned about serif and sans serif typefaces, about varying the amount of space between different letter combinations, about what makes great typography great. None of this had even a hope of any practical application in my life. But ten years later, when we were designing the first Macintosh computer, it all came back to me. And we designed it all into the Mac. If I had never dropped out, I would have never dropped in on that calligraphy class, and personal computers might not have the wonderful typography that they do. You cannot connect the dots looking forward; you can only connect them looking backwards. So you have to trust that the dots will somehow connect in your future.',
      'My second story is about love and loss. I was lucky. I found what I loved to do early in life. Woz and I started Apple in my parents garage when I was 20. In 10 years Apple had grown from just the two of us into a 2 billion dollar company with over 4000 employees. We had just released our finest creation, the Macintosh, and then I got fired. How can you get fired from a company you started? Well, as Apple grew we hired someone who I thought was very talented to run the company with me, but our visions began to diverge and eventually our Board of Directors sided with him. So at 30 I was out. What had been the focus of my entire adult life was gone, and it was devastating.',
      'I did not see it then, but it turned out that getting fired from Apple was the best thing that could have ever happened to me. The heaviness of being successful was replaced by the lightness of being a beginner again. It freed me to enter one of the most creative periods of my life. During the next five years, I started a company named NeXT, another company named Pixar, and fell in love with an amazing woman who would become my wife. In a remarkable turn of events, Apple bought NeXT, I returned to Apple, and the technology we developed at NeXT is at the heart of Apple current renaissance.',
      'My third story is about death. When I was 17, I read a quote that went something like: If you live each day as if it was your last, someday you will most certainly be right. It made an impression on me, and since then, for the past 33 years, I have looked in the mirror every morning and asked myself: If today were the last day of my life, would I want to do what I am about to do today? And whenever the answer has been No for too many days in a row, I know I need to change something. Remembering that you are going to die is the best way I know to avoid the trap of thinking you have something to lose. You are already naked. There is no reason not to follow your heart. Your time is limited, so do not waste it living someone else life. Do not be trapped by dogma, which is living with the results of other people thinking. Do not let the noise of others opinions drown out your own inner voice. And most important, have the courage to follow your heart and intuition. Stay Hungry. Stay Foolish.'
    ],
    annotations: [
      { id: 'sj-1', unitIndex: 1, unitType: 'sentence', text: 'Truth be told', startOffset: 0, endOffset: 13, type: 'fixed_expression', meaning: 'Speaking frankly and honestly', status: 'approved', source: 'deterministic' },
      { id: 'sj-2', unitIndex: 4, unitType: 'sentence', text: 'No big deal', startOffset: 0, endOffset: 11, type: 'idiom', meaning: 'Not important or complicated', status: 'approved', source: 'deterministic' },
      { id: 'sj-3', unitIndex: 6, unitType: 'sentence', text: 'connecting the dots', startOffset: 25, endOffset: 44, type: 'idiom', meaning: 'Understanding how separate events connect to shape destiny', status: 'approved', source: 'deterministic' },
      { id: 'sj-4', unitIndex: 7, unitType: 'sentence', text: 'dropped out of', startOffset: 2, endOffset: 16, type: 'phrasal_verb', meaning: 'Quit attending an educational institution', status: 'approved', source: 'deterministic' },
      { id: 'sj-5', unitIndex: 10, unitType: 'sentence', text: 'put me up for adoption', startOffset: 80, endOffset: 102, type: 'collocation', meaning: 'Made available for legal adoption by parents', status: 'approved', source: 'deterministic' },
      { id: 'sj-6', unitIndex: 14, unitType: 'sentence', text: 'came back to me', startOffset: 80, endOffset: 95, type: 'phrasal_verb', meaning: 'Returned to conscious memory', status: 'approved', source: 'deterministic' },
      { id: 'sj-7', unitIndex: 16, unitType: 'sentence', text: 'dropped in on', startOffset: 52, endOffset: 65, type: 'phrasal_verb', meaning: 'Attended informally as a guest', status: 'approved', source: 'deterministic' },
      { id: 'sj-8', unitIndex: 17, unitType: 'sentence', text: 'connect the dots', startOffset: 11, endOffset: 27, type: 'idiom', meaning: 'Discover connections between past occurrences', status: 'approved', source: 'deterministic' },
      { id: 'sj-9', unitIndex: 17, unitType: 'sentence', text: 'looking forward', startOffset: 28, endOffset: 43, type: 'phrasal_verb', meaning: 'Anticipating what lies ahead in the future', status: 'approved', source: 'deterministic' },
      { id: 'sj-10', unitIndex: 17, unitType: 'sentence', text: 'looking backwards', startOffset: 64, endOffset: 81, type: 'phrasal_verb', meaning: 'Reflecting on past events', status: 'approved', source: 'deterministic' },
      { id: 'sj-11', unitIndex: 29, unitType: 'sentence', text: 'turned out that', startOffset: 22, endOffset: 37, type: 'phrasal_verb', meaning: 'Proved to be the reality over time', status: 'approved', source: 'deterministic' },
      { id: 'sj-12', unitIndex: 32, unitType: 'sentence', text: 'fell in love with', startOffset: 83, endOffset: 100, type: 'idiom', meaning: 'Began to feel deep romantic affection for', status: 'approved', source: 'deterministic' },
      { id: 'sj-13', unitIndex: 33, unitType: 'sentence', text: 'at the heart of', startOffset: 94, endOffset: 109, type: 'idiom', meaning: 'The central core of an organization or technology', status: 'approved', source: 'deterministic' },
      { id: 'sj-14', unitIndex: 36, unitType: 'sentence', text: 'made an impression on me', startOffset: 3, endOffset: 27, type: 'collocation', meaning: 'Influenced deeply and memorably', status: 'approved', source: 'deterministic' },
      { id: 'sj-15', unitIndex: 37, unitType: 'sentence', text: 'in a row', startOffset: 50, endOffset: 58, type: 'fixed_expression', meaning: 'Consecutively without interruption', status: 'approved', source: 'deterministic' },
      { id: 'sj-16', unitIndex: 40, unitType: 'sentence', text: 'follow your heart', startOffset: 26, endOffset: 43, type: 'idiom', meaning: 'Trust and act upon your genuine passions', status: 'approved', source: 'deterministic' },
      { id: 'sj-17', unitIndex: 43, unitType: 'sentence', text: 'drown out', startOffset: 37, endOffset: 46, type: 'phrasal_verb', meaning: 'Overpower or silence another sound or voice', status: 'approved', source: 'deterministic' },
      { id: 'sj-18', unitIndex: 45, unitType: 'sentence', text: 'Stay Hungry', startOffset: 0, endOffset: 11, type: 'fixed_expression', meaning: 'Always retain appetite for learning and ambitious progress', status: 'approved', source: 'deterministic' },
      { id: 'sj-19', unitIndex: 46, unitType: 'sentence', text: 'Stay Foolish', startOffset: 0, endOffset: 12, type: 'fixed_expression', meaning: 'Willing to take bold creative risks regardless of conventions', status: 'approved', source: 'deterministic' }
    ]
  },

  // 2. Sir Ken Robinson: Do Schools Kill Creativity? (Full Speech)
  {
    title: 'Sir Ken Robinson: Do Schools Kill Creativity? (TED)',
    category: 'TED Talk: Education',
    topic: 'Creativity, Educational Reform, Human Potential',
    level: 'B2 Upper-Intermediate',
    sourceType: 'seeded',
    provenance: 'TED Conference (Monterey, California)',
    rightsBasis: 'TED Open Translation & Educational Fair Use',
    status: 'published',
    canonicalText:
      'Good morning. How are you? It has been great, has it not? I have been blown away by the whole thing. In fact, I am leaving. There have been three themes running through the conference which are relevant to what I want to talk about. One is the extraordinary evidence of human creativity in all of the presentations and in all of the people here. The second is that it has put us in a place where we have no idea what is going to happen in terms of the future.\n\nMy contention is that creativity now is as important in education as literacy, and we should treat it with the same status. Kids will take a chance. If they do not know, they will have a go. Am I right? They are not frightened of being wrong. Now, I do not mean to say that being wrong is the same thing as being creative. What we do know is, if you are not prepared to be wrong, you will never come up with anything original.\n\nAnd by the time they get to be adults, most kids have lost that capacity. They have become frightened of being wrong. We run our companies this way. We stigmatize mistakes. And we are now running national education systems where mistakes are the worst thing you can make. The result is that we are educating people out of their creative capacities. Picasso once said that all children are born artists. The problem is to remain an artist as we grow up. I believe this passionately: that we do not grow into creativity; we grow out of it. Or rather, we get educated out of it.\n\nEvery education system on Earth has the same hierarchy of subjects. Every one. Doesn’t matter where you go. You would think it would be otherwise, but it isn’t. At the top are mathematics and languages, then the humanities, and at the bottom are the arts. Everywhere on Earth. And in pretty much every system too, there is a hierarchy within the arts. Art and music are normally given a higher status in schools than drama and dance. There is no education system on the planet that teaches dance everyday to children the way we teach them mathematics. Why? Why not? I think this is rather important. I think math is very important, but so is dance. Children dance all the time if they are allowed to; we all do.\n\nWe need to radically rethink our view of intelligence. We know three things about intelligence. One, it is diverse. We think about the world in all the ways that we experience it. Second, intelligence is dynamic. If you look at the interactions of a human brain, intelligence is wonderfully interactive. And the third thing about intelligence is, it is distinct. Our education system has mined our minds in the way that we strip-mine the earth for a particular commodity. We have to reconstitute our conception of the richness of human capacity. Our only hope for the future is to adopt a new conception of human ecology, one in which we start to reconstitute our conception of the richness of human capacity.',
    sentences: [
      'Good morning.',
      'How are you?',
      'It has been great, has it not?',
      'I have been blown away by the whole thing.',
      'In fact, I am leaving.',
      'There have been three themes running through the conference which are relevant to what I want to talk about.',
      'One is the extraordinary evidence of human creativity in all of the presentations and in all of the people here.',
      'The second is that it has put us in a place where we have no idea what is going to happen in terms of the future.',
      'My contention is that creativity now is as important in education as literacy, and we should treat it with the same status.',
      'Kids will take a chance.',
      'If they do not know, they will have a go.',
      'Am I right?',
      'They are not frightened of being wrong.',
      'Now, I do not mean to say that being wrong is the same thing as being creative.',
      'What we do know is, if you are not prepared to be wrong, you will never come up with anything original.',
      'And by the time they get to be adults, most kids have lost that capacity.',
      'They have become frightened of being wrong.',
      'We run our companies this way.',
      'We stigmatize mistakes.',
      'And we are now running national education systems where mistakes are the worst thing you can make.',
      'The result is that we are educating people out of their creative capacities.',
      'Picasso once said that all children are born artists.',
      'The problem is to remain an artist as we grow up.',
      'I believe this passionately: that we do not grow into creativity; we grow out of it.',
      'Or rather, we get educated out of it.',
      'Every education system on Earth has the same hierarchy of subjects.',
      'Every one.',
      'Doesn’t matter where you go.',
      'You would think it would be otherwise, but it isn’t.',
      'At the top are mathematics and languages, then the humanities, and at the bottom are the arts.',
      'Everywhere on Earth.',
      'And in pretty much every system too, there is a hierarchy within the arts.',
      'Art and music are normally given a higher status in schools than drama and dance.',
      'There is no education system on the planet that teaches dance everyday to children the way we teach them mathematics.',
      'Why?',
      'Why not?',
      'I think this is rather important.',
      'I think math is very important, but so is dance.',
      'Children dance all the time if they are allowed to; we all do.',
      'We need to radically rethink our view of intelligence.',
      'We know three things about intelligence.',
      'One, it is diverse.',
      'We think about the world in all the ways that we experience it.',
      'Second, intelligence is dynamic.',
      'If you look at the interactions of a human brain, intelligence is wonderfully interactive.',
      'And the third thing about intelligence is, it is distinct.',
      'Our education system has mined our minds in the way that we strip-mine the earth for a particular commodity.',
      'We have to reconstitute our conception of the richness of human capacity.',
      'Our only hope for the future is to adopt a new conception of human ecology, one in which we start to reconstitute our conception of the richness of human capacity.'
    ],
    paragraphs: [
      'Good morning. How are you? It has been great, has it not? I have been blown away by the whole thing. In fact, I am leaving. There have been three themes running through the conference which are relevant to what I want to talk about. One is the extraordinary evidence of human creativity in all of the presentations and in all of the people here. The second is that it has put us in a place where we have no idea what is going to happen in terms of the future.',
      'My contention is that creativity now is as important in education as literacy, and we should treat it with the same status. Kids will take a chance. If they do not know, they will have a go. Am I right? They are not frightened of being wrong. Now, I do not mean to say that being wrong is the same thing as being creative. What we do know is, if you are not prepared to be wrong, you will never come up with anything original.',
      'And by the time they get to be adults, most kids have lost that capacity. They have become frightened of being wrong. We run our companies this way. We stigmatize mistakes. And we are now running national education systems where mistakes are the worst thing you can make. The result is that we are educating people out of their creative capacities. Picasso once said that all children are born artists. The problem is to remain an artist as we grow up. I believe this passionately: that we do not grow into creativity; we grow out of it. Or rather, we get educated out of it.',
      'Every education system on Earth has the same hierarchy of subjects. Every one. Doesn’t matter where you go. You would think it would be otherwise, but it isn’t. At the top are mathematics and languages, then the humanities, and at the bottom are the arts. Everywhere on Earth. And in pretty much every system too, there is a hierarchy within the arts. Art and music are normally given a higher status in schools than drama and dance. There is no education system on the planet that teaches dance everyday to children the way we teach them mathematics. Why? Why not? I think this is rather important. I think math is very important, but so is dance. Children dance all the time if they are allowed to; we all do.',
      'We need to radically rethink our view of intelligence. We know three things about intelligence. One, it is diverse. We think about the world in all the ways that we experience it. Second, intelligence is dynamic. If you look at the interactions of a human brain, intelligence is wonderfully interactive. And the third thing about intelligence is, it is distinct. Our education system has mined our minds in the way that we strip-mine the earth for a particular commodity. We have to reconstitute our conception of the richness of human capacity. Our only hope for the future is to adopt a new conception of human ecology, one in which we start to reconstitute our conception of the richness of human capacity.'
    ],
    annotations: [
      { id: 'kr-1', unitIndex: 3, unitType: 'sentence', text: 'blown away by', startOffset: 12, endOffset: 25, type: 'idiom', meaning: 'Deeply impressed and amazed by something', status: 'approved', source: 'deterministic' },
      { id: 'kr-2', unitIndex: 5, unitType: 'sentence', text: 'talk about', startOffset: 92, endOffset: 102, type: 'phrasal_verb', meaning: 'Discuss or give an address upon', status: 'approved', source: 'deterministic' },
      { id: 'kr-3', unitIndex: 7, unitType: 'sentence', text: 'have no idea', startOffset: 45, endOffset: 57, type: 'idiom', meaning: 'Be completely unaware or unable to predict', status: 'approved', source: 'deterministic' },
      { id: 'kr-4', unitIndex: 7, unitType: 'sentence', text: 'in terms of', startOffset: 84, endOffset: 95, type: 'fixed_expression', meaning: 'Regarding or in relation to', status: 'approved', source: 'deterministic' },
      { id: 'kr-5', unitIndex: 9, unitType: 'sentence', text: 'take a chance', startOffset: 10, endOffset: 23, type: 'idiom', meaning: 'Be willing to risk failure to attempt something', status: 'approved', source: 'deterministic' },
      { id: 'kr-6', unitIndex: 10, unitType: 'sentence', text: 'have a go', startOffset: 28, endOffset: 37, type: 'idiom', meaning: 'Try or make an attempt', status: 'approved', source: 'deterministic' },
      { id: 'kr-7', unitIndex: 14, unitType: 'sentence', text: 'come up with', startOffset: 55, endOffset: 67, type: 'phrasal_verb', meaning: 'Produce or discover an inventive idea', status: 'approved', source: 'deterministic' },
      { id: 'kr-8', unitIndex: 19, unitType: 'sentence', text: 'the worst thing you can make', startOffset: 45, endOffset: 73, type: 'collocation', meaning: 'The most heavily penalized mistake', status: 'approved', source: 'deterministic' },
      { id: 'kr-9', unitIndex: 20, unitType: 'sentence', text: 'out of', startOffset: 33, endOffset: 39, type: 'phrasal_verb', meaning: 'Deprived of or separated from', status: 'approved', source: 'deterministic' },
      { id: 'kr-10', unitIndex: 22, unitType: 'sentence', text: 'grow up', startOffset: 36, endOffset: 43, type: 'phrasal_verb', meaning: 'Develop into adulthood', status: 'approved', source: 'deterministic' },
      { id: 'kr-11', unitIndex: 38, unitType: 'sentence', text: 'all the time', startOffset: 15, endOffset: 27, type: 'fixed_expression', meaning: 'Continuously and naturally', status: 'approved', source: 'deterministic' },
      { id: 'kr-12', unitIndex: 48, unitType: 'sentence', text: 'only hope for the future', startOffset: 4, endOffset: 28, type: 'collocation', meaning: 'Sole viable solution moving forward', status: 'approved', source: 'deterministic' }
    ]
  },

  // 3. Simon Sinek: How Great Leaders Inspire Action (Full Speech)
  {
    title: 'Simon Sinek: How Great Leaders Inspire Action (TED)',
    category: 'TED Talk: Leadership',
    topic: 'Leadership, The Golden Circle, Biology of Trust',
    level: 'B2 Upper-Intermediate',
    sourceType: 'seeded',
    provenance: 'TEDxPuget Sound',
    rightsBasis: 'TED Open Educational Fair Use',
    status: 'published',
    canonicalText:
      'How do you explain when things do not go as we assume? Or better, how do you explain when others are able to achieve things that seem to defy all of the assumptions? For example: Why is Apple so innovative? Year after year, after year, they are more innovative than all their competition. And yet, they are just a computer company. They are just like everyone else. They have the same access to the same talent, the same agencies, the same consultants, the same media. Then why is it that they seem to have something different?\n\nAs it turns out, there is a pattern. As it turns out, all the great inspiring leaders and organizations in the world, whether it is Apple or Martin Luther King or the Wright brothers, they all think, act and communicate the exact same way. And it is the complete opposite to everyone else. All I did was codify it, and it is probably the world simplest idea. I call it the Golden Circle.\n\nWhy? How? What? This little idea explains why some organizations and some leaders are able to inspire where others are not. Every single person, every single organization on the planet knows what they do, 100 percent. Some know how they do it, whether you call it your differentiating value proposition or your proprietary process. But very, very few people or organizations know why they do what they do. And by why I do not mean to make a profit. That is a result. By why, I mean: What is your purpose? What is your cause? What is your belief? Why does your organization exist? Why do you get out of bed in the morning? And why should anyone care?\n\nThe way we communicate, the way we market, the way most of us communicate from the outside in: we go from the clearest thing to the fuzziest thing. But the inspired leaders and organizations, regardless of their size, regardless of their industry, all think, act and communicate from the inside out.\n\nPeople do not buy what you do; they buy why you do it. If you talk about what you believe, you will attract those who believe what you believe. The goal is not just to hire people who need a job; it is to hire people who believe what you believe. If you hire people just because they can do a job, they will work for your money. But if you hire people who believe what you believe, they will work for you with blood, sweat, and tears.',
    sentences: [
      'How do you explain when things do not go as we assume?',
      'Or better, how do you explain when others are able to achieve things that seem to defy all of the assumptions?',
      'For example: Why is Apple so innovative?',
      'Year after year, after year, they are more innovative than all their competition.',
      'And yet, they are just a computer company.',
      'They are just like everyone else.',
      'They have the same access to the same talent, the same agencies, the same consultants, the same media.',
      'Then why is it that they seem to have something different?',
      'As it turns out, there is a pattern.',
      'As it turns out, all the great inspiring leaders and organizations in the world, whether it is Apple or Martin Luther King or the Wright brothers, they all think, act and communicate the exact same way.',
      'And it is the complete opposite to everyone else.',
      'All I did was codify it, and it is probably the world simplest idea.',
      'I call it the Golden Circle.',
      'Why? How? What?',
      'This little idea explains why some organizations and some leaders are able to inspire where others are not.',
      'Every single person, every single organization on the planet knows what they do, 100 percent.',
      'Some know how they do it, whether you call it your differentiating value proposition or your proprietary process.',
      'But very, very few people or organizations know why they do what they do.',
      'And by why I do not mean to make a profit.',
      'That is a result.',
      'By why, I mean: What is your purpose?',
      'What is your cause?',
      'What is your belief?',
      'Why does your organization exist?',
      'Why do you get out of bed in the morning?',
      'And why should anyone care?',
      'The way we communicate, the way we market, the way most of us communicate from the outside in: we go from the clearest thing to the fuzziest thing.',
      'But the inspired leaders and organizations, regardless of their size, regardless of their industry, all think, act and communicate from the inside out.',
      'People do not buy what you do; they buy why you do it.',
      'If you talk about what you believe, you will attract those who believe what you believe.',
      'The goal is not just to hire people who need a job; it is to hire people who believe what you believe.',
      'If you hire people just because they can do a job, they will work for your money.',
      'But if you hire people who believe what you believe, they will work for you with blood, sweat, and tears.'
    ],
    paragraphs: [
      'How do you explain when things do not go as we assume? Or better, how do you explain when others are able to achieve things that seem to defy all of the assumptions? For example: Why is Apple so innovative? Year after year, after year, they are more innovative than all their competition. And yet, they are just a computer company. They are just like everyone else. They have the same access to the same talent, the same agencies, the same consultants, the same media. Then why is it that they seem to have something different?',
      'As it turns out, there is a pattern. As it turns out, all the great inspiring leaders and organizations in the world, whether it is Apple or Martin Luther King or the Wright brothers, they all think, act and communicate the exact same way. And it is the complete opposite to everyone else. All I did was codify it, and it is probably the world simplest idea. I call it the Golden Circle.',
      'Why? How? What? This little idea explains why some organizations and some leaders are able to inspire where others are not. Every single person, every single organization on the planet knows what they do, 100 percent. Some know how they do it, whether you call it your differentiating value proposition or your proprietary process. But very, very few people or organizations know why they do what they do. And by why I do not mean to make a profit. That is a result. By why, I mean: What is your purpose? What is your cause? What is your belief? Why does your organization exist? Why do you get out of bed in the morning? And why should anyone care?',
      'The way we communicate, the way we market, the way most of us communicate from the outside in: we go from the clearest thing to the fuzziest thing. But the inspired leaders and organizations, regardless of their size, regardless of their industry, all think, act and communicate from the inside out.',
      'People do not buy what you do; they buy why you do it. If you talk about what you believe, you will attract those who believe what you believe. The goal is not just to hire people who need a job; it is to hire people who believe what you believe. If you hire people just because they can do a job, they will work for your money. But if you hire people who believe what you believe, they will work for you with blood, sweat, and tears.'
    ],
    annotations: [
      { id: 'ss-1', unitIndex: 3, unitType: 'sentence', text: 'Year after year', startOffset: 0, endOffset: 15, type: 'fixed_expression', meaning: 'Consistently over an extended sequence of years', status: 'approved', source: 'deterministic' },
      { id: 'ss-2', unitIndex: 8, unitType: 'sentence', text: 'As it turns out', startOffset: 0, endOffset: 15, type: 'fixed_expression', meaning: 'In actual reality; as revealed by evidence', status: 'approved', source: 'deterministic' },
      { id: 'ss-3', unitIndex: 18, unitType: 'sentence', text: 'make a profit', startOffset: 25, endOffset: 38, type: 'collocation', meaning: 'Earn financial surplus after costs', status: 'approved', source: 'deterministic' },
      { id: 'ss-4', unitIndex: 24, unitType: 'sentence', text: 'get out of bed', startOffset: 11, endOffset: 25, type: 'phrasal_verb', meaning: 'Wake up and begin the day with purpose', status: 'approved', source: 'deterministic' },
      { id: 'ss-5', unitIndex: 26, unitType: 'sentence', text: 'from the outside in', startOffset: 65, endOffset: 84, type: 'idiom', meaning: 'Approaching from external features toward the core', status: 'approved', source: 'deterministic' },
      { id: 'ss-6', unitIndex: 27, unitType: 'sentence', text: 'from the inside out', startOffset: 119, endOffset: 138, type: 'idiom', meaning: 'Originating deeply from core belief toward external actions', status: 'approved', source: 'deterministic' },
      { id: 'ss-7', unitIndex: 29, unitType: 'sentence', text: 'talk about', startOffset: 7, endOffset: 17, type: 'phrasal_verb', meaning: 'Articulate and communicate ideas', status: 'approved', source: 'deterministic' },
      { id: 'ss-8', unitIndex: 32, unitType: 'sentence', text: 'blood, sweat, and tears', startOffset: 71, endOffset: 94, type: 'idiom', meaning: 'Complete dedication and intense hard work', status: 'approved', source: 'deterministic' }
    ]
  },

  // 4. Amy Cuddy: Your Body Language May Shape Who You Are (Full Speech)
  {
    title: 'Amy Cuddy: Body Language Shapes Who You Are (TED)',
    category: 'TED Talk: Psychology',
    topic: 'Presence, Nonverbal Behavior, Power Posing',
    level: 'B2 Upper-Intermediate',
    sourceType: 'seeded',
    provenance: 'TEDGlobal (Edinburgh, Scotland)',
    rightsBasis: 'TED Open Educational Fair Use',
    status: 'published',
    canonicalText:
      'So I want to start by offering you a free no-tech life hack, and all it requires of you is this: that you change your posture for two minutes. But before I give it away, I want to ask you to evaluate your body language right now. How many of you are sort of making yourselves smaller? Maybe you are crossing your legs, or wrapping your ankles, or folding your arms.\n\nWe are fascinated by nonverbals, and we are particularly interested in other people nonverbals. When we think about nonverbals, we think about judgments: how we judge other people, how they judge us, and what the outcomes are. But we tend to forget the other audience that is influenced by our nonverbals, and that is ourselves. We are influenced by our nonverbals, our thoughts and our feelings and our physiology.\n\nWhat do I mean by that? In the animal kingdom, power poses are all about expanding. You make yourself big, you stretch out, you take up space. It is true across primates, and humans do the same thing. They put their hands up in a V when they cross the finish line in a race, even blind athletes who have never seen anyone do it. But what do we do when we feel powerless? We do the exact opposite. We close up. We wrap ourselves up. We make ourselves small.\n\nSo our question was: Can power posing for just two minutes produce significant physiological changes? We brought people into the lab, had them take either high-power poses or low-power poses for two minutes. What did we find? On testosterone, the dominance hormone, high-power people experienced about a 20 percent increase. Low-power people experienced about a 10 percent decrease. On cortisol, the stress hormone, high-power people experienced about a 25 percent decrease, and low-power people experienced about a 15 percent increase. Two minutes lead to these hormonal changes that configure your brain to basically be either assertive, confident and comfortable, or really stress-reactive.\n\nSo when I tell people about this, they say: It feels fake! Right? So I said to my students: Fake it till you make it. Do not just fake it until you make it; fake it until you become it. Do it enough until you actually become it and internalize it. Tiny tweaks can lead to big changes. Try it before your next stressful situation: in the elevator, in the bathroom stall, at your desk. Two minutes. Configure your brain to cope the best in that situation. Leave that situation feeling: I really got to say who I am and show who I am.',
    sentences: [
      'So I want to start by offering you a free no-tech life hack, and all it requires of you is this: that you change your posture for two minutes.',
      'But before I give it away, I want to ask you to evaluate your body language right now.',
      'How many of you are sort of making yourselves smaller?',
      'Maybe you are crossing your legs, or wrapping your ankles, or folding your arms.',
      'We are fascinated by nonverbals, and we are particularly interested in other people nonverbals.',
      'When we think about nonverbals, we think about judgments: how we judge other people, how they judge us, and what the outcomes are.',
      'But we tend to forget the other audience that is influenced by our nonverbals, and that is ourselves.',
      'We are influenced by our nonverbals, our thoughts and our feelings and our physiology.',
      'What do I mean by that?',
      'In the animal kingdom, power poses are all about expanding.',
      'You make yourself big, you stretch out, you take up space.',
      'It is true across primates, and humans do the same thing.',
      'They put their hands up in a V when they cross the finish line in a race, even blind athletes who have never seen anyone do it.',
      'But what do we do when we feel powerless?',
      'We do the exact opposite.',
      'We close up.',
      'We wrap ourselves up.',
      'We make ourselves small.',
      'So our question was: Can power posing for just two minutes produce significant physiological changes?',
      'We brought people into the lab, had them take either high-power poses or low-power poses for two minutes.',
      'What did we find?',
      'On testosterone, the dominance hormone, high-power people experienced about a 20 percent increase.',
      'Low-power people experienced about a 10 percent decrease.',
      'On cortisol, the stress hormone, high-power people experienced about a 25 percent decrease, and low-power people experienced about a 15 percent increase.',
      'Two minutes lead to these hormonal changes that configure your brain to basically be either assertive, confident and comfortable, or really stress-reactive.',
      'So when I tell people about this, they say: It feels fake!',
      'Right?',
      'So I said to my students: Fake it till you make it.',
      'Do not just fake it until you make it; fake it until you become it.',
      'Do it enough until you actually become it and internalize it.',
      'Tiny tweaks can lead to big changes.',
      'Try it before your next stressful situation: in the elevator, in the bathroom stall, at your desk.',
      'Two minutes.',
      'Configure your brain to cope the best in that situation.',
      'Leave that situation feeling: I really got to say who I am and show who I am.'
    ],
    paragraphs: [
      'So I want to start by offering you a free no-tech life hack, and all it requires of you is this: that you change your posture for two minutes. But before I give it away, I want to ask you to evaluate your body language right now. How many of you are sort of making yourselves smaller? Maybe you are crossing your legs, or wrapping your ankles, or folding your arms.',
      'We are fascinated by nonverbals, and we are particularly interested in other people nonverbals. When we think about nonverbals, we think about judgments: how we judge other people, how they judge us, and what the outcomes are. But we tend to forget the other audience that is influenced by our nonverbals, and that is ourselves. We are influenced by our nonverbals, our thoughts and our feelings and our physiology.',
      'What do I mean by that? In the animal kingdom, power poses are all about expanding. You make yourself big, you stretch out, you take up space. It is true across primates, and humans do the same thing. They put their hands up in a V when they cross the finish line in a race, even blind athletes who have never seen anyone do it. But what do we do when we feel powerless? We do the exact opposite. We close up. We wrap ourselves up. We make ourselves small.',
      'So our question was: Can power posing for just two minutes produce significant physiological changes? We brought people into the lab, had them take either high-power poses or low-power poses for two minutes. What did we find? On testosterone, the dominance hormone, high-power people experienced about a 20 percent increase. Low-power people experienced about a 10 percent decrease. On cortisol, the stress hormone, high-power people experienced about a 25 percent decrease, and low-power people experienced about a 15 percent increase. Two minutes lead to these hormonal changes that configure your brain to basically be either assertive, confident and comfortable, or really stress-reactive.',
      'So when I tell people about this, they say: It feels fake! Right? So I said to my students: Fake it till you make it. Do not just fake it until you make it; fake it until you become it. Do it enough until you actually become it and internalize it. Tiny tweaks can lead to big changes. Try it before your next stressful situation: in the elevator, in the bathroom stall, at your desk. Two minutes. Configure your brain to cope the best in that situation. Leave that situation feeling: I really got to say who I am and show who I am.'
    ],
    annotations: [
      { id: 'ac-1', unitIndex: 1, unitType: 'sentence', text: 'give it away', startOffset: 16, endOffset: 28, type: 'phrasal_verb', meaning: 'Reveal the secret or technique', status: 'approved', source: 'deterministic' },
      { id: 'ac-2', unitIndex: 10, unitType: 'sentence', text: 'take up space', startOffset: 41, endOffset: 54, type: 'idiom', meaning: 'Assert presence physically without apology', status: 'approved', source: 'deterministic' },
      { id: 'ac-3', unitIndex: 12, unitType: 'sentence', text: 'finish line', startOffset: 53, endOffset: 64, type: 'collocation', meaning: 'The end goal or conclusion of a competition', status: 'approved', source: 'deterministic' },
      { id: 'ac-4', unitIndex: 15, unitType: 'sentence', text: 'close up', startOffset: 3, endOffset: 11, type: 'phrasal_verb', meaning: 'Contract inward defensively', status: 'approved', source: 'deterministic' },
      { id: 'ac-5', unitIndex: 24, unitType: 'sentence', text: 'lead to', startOffset: 12, endOffset: 19, type: 'phrasal_verb', meaning: 'Cause or result in physiological transitions', status: 'approved', source: 'deterministic' },
      { id: 'ac-6', unitIndex: 27, unitType: 'sentence', text: 'Fake it till you make it', startOffset: 24, endOffset: 48, type: 'idiom', meaning: 'Emulate confidence until genuine mastery is realized', status: 'approved', source: 'deterministic' },
      { id: 'ac-7', unitIndex: 28, unitType: 'sentence', text: 'fake it until you become it', startOffset: 37, endOffset: 64, type: 'idiom', meaning: 'Embody characteristics until they form your authentic identity', status: 'approved', source: 'deterministic' },
      { id: 'ac-8', unitIndex: 30, unitType: 'sentence', text: 'lead to', startOffset: 16, endOffset: 23, type: 'phrasal_verb', meaning: 'Produce large-scale consequences', status: 'approved', source: 'deterministic' }
    ]
  },

  // 5. Tim Urban: Inside the Mind of a Master Procrastinator (Full Speech)
  {
    title: 'Tim Urban: Inside the Mind of a Procrastinator (TED)',
    category: 'TED Talk: Psychology',
    topic: 'Procrastination, Rational Mind, Panic Monster',
    level: 'B1 Intermediate',
    sourceType: 'seeded',
    provenance: 'TED Conference (Vancouver, Canada)',
    rightsBasis: 'TED Open Educational Fair Use',
    status: 'published',
    canonicalText:
      'So in college, I was a government major, which means I had to write a lot of papers. When a normal student writes a paper, they spread things out. You start off a little bit on week one, you write a bit more on week two, and by the deadline, everything is done smoothly. I wanted to do that. But then the paper would come, and I would plan to do it, and nothing would happen until the very last 72 hours. I wrote a 90-page senior thesis in three days, without sleeping. It was not a good experience.\n\nYears later, I decided to write about this on my blog, Wait But Why. I wanted to explain to the world what goes on in the minds of procrastinators. Both brains have a Rational Decision-Maker. But the procrastinator brain also has an Instant Gratification Monkey. Now, what does the monkey do? The monkey only cares about two things: easy and fun. In the monkey world, it is very simple: Why would we read a boring book when we can watch videos of people falling down stairs?\n\nSo the Rational Decision-Maker wants us to do well-planned, productive work, but the monkey wants us to browse Wikipedia articles on random topics or look in the refrigerator for the tenth time. And so the procrastinator spends a lot of time in a place called the Dark Playground. The Dark Playground is a place where leisure activities happen when leisure activities are not supposed to be happening. The fun you have in the Dark Playground is not actually fun, because it comes with dread, guilt, anxiety, and self-hatred.\n\nSo how does the procrastinator ever get anything done? It turns out the procrastinator has a guardian angel, a terrifying creature called the Panic Monster. The Panic Monster is dormant most of the time, but he suddenly wakes up anytime a deadline gets too close or there is danger of public embarrassment, a career catastrophe, or failing a class. And when the Panic Monster wakes up, the monkey freaks out and runs up a tree! And suddenly, the procrastinator can finally focus and burn the midnight oil to finish the paper.\n\nNow, there are two kinds of procrastination: deadline-based procrastination, and procrastination where there is no deadline, like starting a business, writing a book, or taking care of your health. Non-deadline procrastination is much less visible and much more dangerous, because the Panic Monster never wakes up. I want to show you one last thing: this is a Life Calendar. It shows one box for every week of a 90-year life. There are not that many boxes, especially since we have already used a bunch of them. We need to stay aware of the Instant Gratification Monkey. It is a job we should all start today.',
    sentences: [
      'So in college, I was a government major, which means I had to write a lot of papers.',
      'When a normal student writes a paper, they spread things out.',
      'You start off a little bit on week one, you write a bit more on week two, and by the deadline, everything is done smoothly.',
      'I wanted to do that.',
      'But then the paper would come, and I would plan to do it, and nothing would happen until the very last 72 hours.',
      'I wrote a 90-page senior thesis in three days, without sleeping.',
      'It was not a good experience.',
      'Years later, I decided to write about this on my blog, Wait But Why.',
      'I wanted to explain to the world what goes on in the minds of procrastinators.',
      'Both brains have a Rational Decision-Maker.',
      'But the procrastinator brain also has an Instant Gratification Monkey.',
      'Now, what does the monkey do?',
      'The monkey only cares about two things: easy and fun.',
      'In the monkey world, it is very simple: Why would we read a boring book when we can watch videos of people falling down stairs?',
      'So the Rational Decision-Maker wants us to do well-planned, productive work, but the monkey wants us to browse Wikipedia articles on random topics or look in the refrigerator for the tenth time.',
      'And so the procrastinator spends a lot of time in a place called the Dark Playground.',
      'The Dark Playground is a place where leisure activities happen when leisure activities are not supposed to be happening.',
      'The fun you have in the Dark Playground is not actually fun, because it comes with dread, guilt, anxiety, and self-hatred.',
      'So how does the procrastinator ever get anything done?',
      'It turns out the procrastinator has a guardian angel, a terrifying creature called the Panic Monster.',
      'The Panic Monster is dormant most of the time, but he suddenly wakes up anytime a deadline gets too close or there is danger of public embarrassment, a career catastrophe, or failing a class.',
      'And when the Panic Monster wakes up, the monkey freaks out and runs up a tree!',
      'And suddenly, the procrastinator can finally focus and burn the midnight oil to finish the paper.',
      'Now, there are two kinds of procrastination: deadline-based procrastination, and procrastination where there is no deadline, like starting a business, writing a book, or taking care of your health.',
      'Non-deadline procrastination is much less visible and much more dangerous, because the Panic Monster never wakes up.',
      'I want to show you one last thing: this is a Life Calendar.',
      'It shows one box for every week of a 90-year life.',
      'There are not that many boxes, especially since we have already used a bunch of them.',
      'We need to stay aware of the Instant Gratification Monkey.',
      'It is a job we should all start today.'
    ],
    paragraphs: [
      'So in college, I was a government major, which means I had to write a lot of papers. When a normal student writes a paper, they spread things out. You start off a little bit on week one, you write a bit more on week two, and by the deadline, everything is done smoothly. I wanted to do that. But then the paper would come, and I would plan to do it, and nothing would happen until the very last 72 hours. I wrote a 90-page senior thesis in three days, without sleeping. It was not a good experience.',
      'Years later, I decided to write about this on my blog, Wait But Why. I wanted to explain to the world what goes on in the minds of procrastinators. Both brains have a Rational Decision-Maker. But the procrastinator brain also has an Instant Gratification Monkey. Now, what does the monkey do? The monkey only cares about two things: easy and fun. In the monkey world, it is very simple: Why would we read a boring book when we can watch videos of people falling down stairs?',
      'So the Rational Decision-Maker wants us to do well-planned, productive work, but the monkey wants us to browse Wikipedia articles on random topics or look in the refrigerator for the tenth time. And so the procrastinator spends a lot of time in a place called the Dark Playground. The Dark Playground is a place where leisure activities happen when leisure activities are not supposed to be happening. The fun you have in the Dark Playground is not actually fun, because it comes with dread, guilt, anxiety, and self-hatred.',
      'So how does the procrastinator ever get anything done? It turns out the procrastinator has a guardian angel, a terrifying creature called the Panic Monster. The Panic Monster is dormant most of the time, but he suddenly wakes up anytime a deadline gets too close or there is danger of public embarrassment, a career catastrophe, or failing a class. And when the Panic Monster wakes up, the monkey freaks out and runs up a tree! And suddenly, the procrastinator can finally focus and burn the midnight oil to finish the paper.',
      'Now, there are two kinds of procrastination: deadline-based procrastination, and procrastination where there is no deadline, like starting a business, writing a book, or taking care of your health. Non-deadline procrastination is much less visible and much more dangerous, because the Panic Monster never wakes up. I want to show you one last thing: this is a Life Calendar. It shows one box for every week of a 90-year life. There are not that many boxes, especially since we have already used a bunch of them. We need to stay aware of the Instant Gratification Monkey. It is a job we should all start today.'
    ],
    annotations: [
      { id: 'tu-1', unitIndex: 1, unitType: 'sentence', text: 'spread things out', startOffset: 41, endOffset: 58, type: 'phrasal_verb', meaning: 'Distribute tasks evenly over time', status: 'approved', source: 'deterministic' },
      { id: 'tu-2', unitIndex: 2, unitType: 'sentence', text: 'start off', startOffset: 4, endOffset: 13, type: 'phrasal_verb', meaning: 'Begin an endeavor initial phase', status: 'approved', source: 'deterministic' },
      { id: 'tu-3', unitIndex: 7, unitType: 'sentence', text: 'write about', startOffset: 25, endOffset: 36, type: 'phrasal_verb', meaning: 'Compose text analyzing a subject', status: 'approved', source: 'deterministic' },
      { id: 'tu-4', unitIndex: 12, unitType: 'sentence', text: 'cares about', startOffset: 17, endOffset: 28, type: 'phrasal_verb', meaning: 'Places value upon or attends to', status: 'approved', source: 'deterministic' },
      { id: 'tu-5', unitIndex: 19, unitType: 'sentence', text: 'It turns out', startOffset: 0, endOffset: 12, type: 'fixed_expression', meaning: 'As reality reveals itself to be', status: 'approved', source: 'deterministic' },
      { id: 'tu-6', unitIndex: 20, unitType: 'sentence', text: 'wakes up', startOffset: 52, endOffset: 60, type: 'phrasal_verb', meaning: 'Awakens from dormancy', status: 'approved', source: 'deterministic' },
      { id: 'tu-7', unitIndex: 21, unitType: 'sentence', text: 'freaks out', startOffset: 48, endOffset: 58, type: 'phrasal_verb', meaning: 'Panics violently', status: 'approved', source: 'deterministic' },
      { id: 'tu-8', unitIndex: 22, unitType: 'sentence', text: 'burn the midnight oil', startOffset: 51, endOffset: 72, type: 'idiom', meaning: 'Work deep into the night under severe pressure', status: 'approved', source: 'deterministic' },
      { id: 'tu-9', unitIndex: 23, unitType: 'sentence', text: 'taking care of', startOffset: 120, endOffset: 134, type: 'phrasal_verb', meaning: 'Attending conscientiously to health or needs', status: 'approved', source: 'deterministic' }
    ]
  },

  // 6. Julian Treasure: How to Speak So That People Want to Listen (Full Speech)
  {
    title: 'Julian Treasure: How to Speak So People Listen (TED)',
    category: 'TED Talk: Communication',
    topic: 'Vocal Presence, HAIL Framework, The Voice Toolbox',
    level: 'C1 Advanced',
    sourceType: 'seeded',
    provenance: 'TEDGlobal Conference',
    rightsBasis: 'TED Open Educational Fair Use',
    status: 'published',
    canonicalText:
      'The human voice: It is the instrument we all play. It is the most powerful sound in the world, probably. It is the only one that can start a war or say I love you. And yet many people have the experience that when they speak, people do not listen to them. And why is that? How can we speak powerfully to make change in the world?\n\nI would like to suggest that there are a number of habits that we need to move away from. I have assembled for your pleasure the seven deadly sins of speaking. I do not pretend this is exhaustive, but these seven, I think, are pretty large habits that we can all fall into. First, gossip. Speaking badly of somebody who is not present. Second, judging. We know people who are like this in conversation, and it is very hard to listen to somebody if you know you are being judged. Third, negativity. You can fall into this habit, and it is hard to listen when somebody is that negative. Fourth, complaining. It is viral misery. Fifth, excuses. We all have met this guy: they just pass the buck to everybody else. Sixth, exaggeration. It demeans our language. And finally, dogmatism. The confusion of facts with opinions.\n\nNow, is there a positive way to think about this? Yes, there is. I would like to suggest that there are four really powerful cornerstones, foundations, that we can stand on if we want our speech to be powerful and to make change in the world. Fortunately, these things spell a word: HAIL. And it has a great definition. What does it stand for? See if you can guess. The H, honesty, of course: being true in what you say, being straight and clear. The A is authenticity: just being yourself. The I is integrity: being your word, actually doing what you say, and being somebody people can trust. And the L is love: I do not mean romantic love, but wishing people well.\n\nNow, what about your toolbox? You have an amazing toolbox. This instrument is incredible, and yet this is a toolbox that very few people have ever opened. Let us have a look inside. First, register. For example, falsetto register, or you can go down into your throat, which is where most of us speak from. But if you want weight, you need to go down here into the chest. You hear the difference? We vote for politicians with lower voices, it is true, because we associate depth with power and with authority.\n\nThen we have timbre. It is the way your voice feels. Again, the research shows that we prefer voices which are rich, smooth, warm, like hot chocolate. Next, prosody. The sing-song, the meta-language that we use to impart meaning. Please avoid monotonic delivery. Next, pace. You can get very excited by saying something very quickly, or you can slow right down to emphasize, and at the end of that, of course, is our old friend silence. Just an ordinary pause. You do not have to fill it with um and ah. Silence can be very powerful.',
    sentences: [
      'The human voice: It is the instrument we all play.',
      'It is the most powerful sound in the world, probably.',
      'It is the only one that can start a war or say I love you.',
      'And yet many people have the experience that when they speak, people do not listen to them.',
      'And why is that?',
      'How can we speak powerfully to make change in the world?',
      'I would like to suggest that there are a number of habits that we need to move away from.',
      'I have assembled for your pleasure the seven deadly sins of speaking.',
      'I do not pretend this is exhaustive, but these seven, I think, are pretty large habits that we can all fall into.',
      'First, gossip.',
      'Speaking badly of somebody who is not present.',
      'Second, judging.',
      'We know people who are like this in conversation, and it is very hard to listen to somebody if you know you are being judged.',
      'Third, negativity.',
      'You can fall into this habit, and it is hard to listen when somebody is that negative.',
      'Fourth, complaining.',
      'It is viral misery.',
      'Fifth, excuses.',
      'We all have met this guy: they just pass the buck to everybody else.',
      'Sixth, exaggeration.',
      'It demeans our language.',
      'And finally, dogmatism.',
      'The confusion of facts with opinions.',
      'Now, is there a positive way to think about this?',
      'Yes, there is.',
      'I would like to suggest that there are four really powerful cornerstones, foundations, that we can stand on if we want our speech to be powerful and to make change in the world.',
      'Fortunately, these things spell a word: HAIL.',
      'And it has a great definition.',
      'What does it stand for?',
      'See if you can guess.',
      'The H, honesty, of course: being true in what you say, being straight and clear.',
      'The A is authenticity: just being yourself.',
      'The I is integrity: being your word, actually doing what you say, and being somebody people can trust.',
      'And the L is love: I do not mean romantic love, but wishing people well.',
      'Now, what about your toolbox?',
      'You have an amazing toolbox.',
      'This instrument is incredible, and yet this is a toolbox that very few people have ever opened.',
      'Let us have a look inside.',
      'First, register.',
      'For example, falsetto register, or you can go down into your throat, which is where most of us speak from.',
      'But if you want weight, you need to go down here into the chest.',
      'You hear the difference?',
      'We vote for politicians with lower voices, it is true, because we associate depth with power and with authority.',
      'Then we have timbre.',
      'It is the way your voice feels.',
      'Again, the research shows that we prefer voices which are rich, smooth, warm, like hot chocolate.',
      'Next, prosody.',
      'The sing-song, the meta-language that we use to impart meaning.',
      'Please avoid monotonic delivery.',
      'Next, pace.',
      'You can get very excited by saying something very quickly, or you can slow right down to emphasize, and at the end of that, of course, is our old friend silence.',
      'Just an ordinary pause.',
      'You do not have to fill it with um and ah.',
      'Silence can be very powerful.'
    ],
    paragraphs: [
      'The human voice: It is the instrument we all play. It is the most powerful sound in the world, probably. It is the only one that can start a war or say I love you. And yet many people have the experience that when they speak, people do not listen to them. And why is that? How can we speak powerfully to make change in the world?',
      'I would like to suggest that there are a number of habits that we need to move away from. I have assembled for your pleasure the seven deadly sins of speaking. I do not pretend this is exhaustive, but these seven, I think, are pretty large habits that we can all fall into. First, gossip. Speaking badly of somebody who is not present. Second, judging. We know people who are like this in conversation, and it is very hard to listen to somebody if you know you are being judged. Third, negativity. You can fall into this habit, and it is hard to listen when somebody is that negative. Fourth, complaining. It is viral misery. Fifth, excuses. We all have met this guy: they just pass the buck to everybody else. Sixth, exaggeration. It demeans our language. And finally, dogmatism. The confusion of facts with opinions.',
      'Now, is there a positive way to think about this? Yes, there is. I would like to suggest that there are four really powerful cornerstones, foundations, that we can stand on if we want our speech to be powerful and to make change in the world. Fortunately, these things spell a word: HAIL. And it has a great definition. What does it stand for? See if you can guess. The H, honesty, of course: being true in what you say, being straight and clear. The A is authenticity: just being yourself. The I is integrity: being your word, actually doing what you say, and being somebody people can trust. And the L is love: I do not mean romantic love, but wishing people well.',
      'Now, what about your toolbox? You have an amazing toolbox. This instrument is incredible, and yet this is a toolbox that very few people have ever opened. Let us have a look inside. First, register. For example, falsetto register, or you can go down into your throat, which is where most of us speak from. But if you want weight, you need to go down here into the chest. You hear the difference? We vote for politicians with lower voices, it is true, because we associate depth with power and with authority.',
      'Then we have timbre. It is the way your voice feels. Again, the research shows that we prefer voices which are rich, smooth, warm, like hot chocolate. Next, prosody. The sing-song, the meta-language that we use to impart meaning. Please avoid monotonic delivery. Next, pace. You can get very excited by saying something very quickly, or you can slow right down to emphasize, and at the end of that, of course, is our old friend silence. Just an ordinary pause. You do not have to fill it with um and ah. Silence can be very powerful.'
    ],
    annotations: [
      { id: 'jt-1', unitIndex: 5, unitType: 'sentence', text: 'make change in the world', startOffset: 32, endOffset: 56, type: 'idiom', meaning: 'Exert significant positive influence globally', status: 'approved', source: 'deterministic' },
      { id: 'jt-2', unitIndex: 6, unitType: 'sentence', text: 'move away from', startOffset: 67, endOffset: 81, type: 'phrasal_verb', meaning: 'Discard counterproductive habits', status: 'approved', source: 'deterministic' },
      { id: 'jt-3', unitIndex: 8, unitType: 'sentence', text: 'fall into', startOffset: 92, endOffset: 101, type: 'phrasal_verb', meaning: 'Lapse into negative behavioral patterns', status: 'approved', source: 'deterministic' },
      { id: 'jt-4', unitIndex: 18, unitType: 'sentence', text: 'pass the buck', startOffset: 29, endOffset: 42, type: 'idiom', meaning: 'Shift responsibility or blame to others', status: 'approved', source: 'deterministic' },
      { id: 'jt-5', unitIndex: 25, unitType: 'sentence', text: 'stand on', startOffset: 114, endOffset: 122, type: 'phrasal_verb', meaning: 'Be firmly grounded upon core principles', status: 'approved', source: 'deterministic' },
      { id: 'jt-6', unitIndex: 28, unitType: 'sentence', text: 'stand for', startOffset: 13, endOffset: 22, type: 'phrasal_verb', meaning: 'Symbolize or represent values', status: 'approved', source: 'deterministic' },
      { id: 'jt-7', unitIndex: 37, unitType: 'sentence', text: 'have a look', startOffset: 7, endOffset: 18, type: 'collocation', meaning: 'Inspect or examine closely', status: 'approved', source: 'deterministic' },
      { id: 'jt-8', unitIndex: 50, unitType: 'sentence', text: 'slow right down', startOffset: 67, endOffset: 82, type: 'phrasal_verb', meaning: 'Decelerate vocal cadence intentionally', status: 'approved', source: 'deterministic' }
    ]
  }
];

export async function fetchTeacherResources(teacherUid: string): Promise<ReadingResource[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('ownerId', '==', teacherUid));
    const snapshot = await getDocs(q);
    const resources: ReadingResource[] = [];
    snapshot.forEach(docSnap => {
      resources.push({ ...(docSnap.data() as ReadingResource), id: docSnap.id });
    });
    return resources;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function saveReadingResource(
  resource: Partial<ReadingResource> & { title: string; canonicalText: string; category: string }
): Promise<ReadingResource> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error('Teacher must be signed in to save resources');

  const docId = resource.id || `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const sentences = resource.sentences && resource.sentences.length > 0
    ? resource.sentences
    : segmentSentences(resource.canonicalText);
  const paragraphs = resource.paragraphs && resource.paragraphs.length > 0
    ? resource.paragraphs
    : segmentParagraphs(resource.canonicalText);

  // If annotations are not yet provided, detect deterministic candidates
  const annotations = resource.annotations || detectAllPhrasesForResource(sentences, 'sentence');

  const fullResource: ReadingResource = {
    id: docId,
    ownerId: currentUid,
    title: resource.title.trim(),
    category: resource.category.trim() || 'General',
    topic: resource.topic?.trim() || 'Reading Practice',
    level: resource.level || 'B2 Upper-Intermediate',
    sourceType: resource.sourceType || 'seeded',
    sourceUrl: resource.sourceUrl || '',
    provenance: resource.provenance || 'Teacher Library',
    rightsBasis: resource.rightsBasis || 'Fair Educational Use',
    status: resource.status || 'published',
    canonicalText: resource.canonicalText.trim(),
    sentences,
    paragraphs,
    annotations,
    publishedVersionId: resource.publishedVersionId || (resource.status === 'published' ? `v_${Date.now()}` : undefined),
    updatedAt: serverTimestamp(),
    createdAt: resource.createdAt || serverTimestamp(),
  };

  try {
    await setDoc(doc(db, COLLECTION_NAME, docId), fullResource);
    return fullResource;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTION_NAME}/${docId}`);
  }
}

export async function updateResourceAnnotations(
  resourceId: string,
  annotations: PhraseAnnotation[]
): Promise<void> {
  try {
    const ref = doc(db, COLLECTION_NAME, resourceId);
    await updateDoc(ref, {
      annotations,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${resourceId}`);
  }
}

export async function publishResource(resourceId: string): Promise<string> {
  const versionId = `pub_${Date.now()}`;
  try {
    const ref = doc(db, COLLECTION_NAME, resourceId);
    await updateDoc(ref, {
      status: 'published',
      publishedVersionId: versionId,
      updatedAt: serverTimestamp(),
    });
    return versionId;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${resourceId}`);
  }
}

export async function deleteResource(resourceId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, resourceId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${resourceId}`);
  }
}

/**
 * Seed initial sample resources into teacher's library if empty or on demand,
 * and automatically upgrade any truncated resources to full speeches.
 */
export async function seedTeacherLibraryIfEmpty(teacherUid: string, forceSeed: boolean = false): Promise<void> {
  try {
    const existing = await fetchTeacherResources(teacherUid);
    
    // Always check every seeded resource
    for (const item of SEEDED_DEFAULT_RESOURCES) {
      const match = existing.find(e => 
        e.title === item.title || 
        (item.title.includes('Steve Jobs') && e.title.includes('Steve Jobs')) ||
        (item.title.includes('Sir Ken Robinson') && e.title.includes('Ken Robinson')) ||
        (item.title.includes('Simon Sinek') && e.title.includes('Simon Sinek')) ||
        (item.title.includes('Amy Cuddy') && e.title.includes('Amy Cuddy')) ||
        (item.title.includes('Tim Urban') && e.title.includes('Tim Urban')) ||
        (item.title.includes('Julian Treasure') && e.title.includes('Julian Treasure'))
      );

      if (!match) {
        // Missing resource: insert full version
        await saveReadingResource({
          ...item,
          ownerId: teacherUid,
        });
      } else if (forceSeed || (match.sentences && match.sentences.length < item.sentences.length)) {
        // Existing version is truncated: upgrade to full version
        await updateDoc(doc(db, COLLECTION_NAME, match.id), {
          title: item.title,
          category: item.category,
          topic: item.topic,
          level: item.level,
          provenance: item.provenance,
          rightsBasis: item.rightsBasis,
          canonicalText: item.canonicalText,
          sentences: item.sentences,
          paragraphs: item.paragraphs,
          annotations: item.annotations,
          status: 'published',
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (e) {
    console.warn('Seeding note:', e);
  }
}

/**
 * Force refresh and sync all 6 full speeches (Steve Jobs + 5 TED Talks)
 */
export async function resetAndSyncFullResources(teacherUid: string): Promise<ReadingResource[]> {
  await seedTeacherLibraryIfEmpty(teacherUid, true);
  return await fetchTeacherResources(teacherUid);
}

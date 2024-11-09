import { useState, useEffect, useCallback } from 'react';
import * as StreamDeck from '@elgato-stream-deck/webhid';
import { StreamDeckEvents } from '@elgato-stream-deck/core';

type EventHandlers = {
  [K in keyof StreamDeckEvents]?: (...args: StreamDeckEvents[K]) => void;
};

function useStreamDeck(eventHandlers: EventHandlers) {
  const [streamDecks, setStreamDecks] = useState<StreamDeck.StreamDeckWeb[]>([]);

  // Fetch currently attached Stream Decks on mount
  useEffect(() => {
    let isMounted = true;

    async function getAttachedStreamDecks() {
      try {
        const decks = await StreamDeck.getStreamDecks();
        if (isMounted) {
          setStreamDecks(decks);
        }
      } catch (err) {
        console.error('Failed to get Stream Decks:', err);
      }
    }

    getAttachedStreamDecks();

    return () => {
      isMounted = false;
    };
  }, []);

  // Function to pair Stream Decks outside the hook
  const pairStreamDeck = useCallback(async () => {
    try {
      const newDecks = await StreamDeck.requestStreamDecks();
      setStreamDecks((prevDecks) => [...prevDecks, ...newDecks]);
    } catch (err) {
      console.error('Failed to request Stream Deck:', err);
    }
  }, [setStreamDecks]);

  // Bind 'b' key to request Stream Deck pairing
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'b') {
        await pairStreamDeck();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pairStreamDeck]);

  // Bind event handlers to Stream Deck events
  useEffect(() => {
    streamDecks.forEach((deck) => {
      deck.removeAllListeners();

      Object.entries(eventHandlers).forEach(([event, handler]) => {
        // @ts-expect-error
        deck.on(event as keyof StreamDeckEvents, handler);
      });
    });

    return () => streamDecks.forEach((deck) => deck.removeAllListeners());
  }, [streamDecks, eventHandlers]);

  return { streamDecks, pairStreamDeck };
}

export default useStreamDeck;

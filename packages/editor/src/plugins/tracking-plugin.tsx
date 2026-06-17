import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { EditorTracker } from '../tracking/editor-tracker';
import { EditorTrackerConfig } from '../types';

/**
 * TrackingPlugin integrates keystroke tracking into Lexical editor
 */
export function TrackingPlugin(props: EditorTrackerConfig): null {
  const [editor] = useLexicalComposerContext();
  const callbacksRef = useRef({
    onEvent: props.onEvent,
    onEventsBuffer: props.onEventsBuffer,
    onEventFlushReady: props.onEventFlushReady,
  });

  useEffect(() => {
    callbacksRef.current = {
      onEvent: props.onEvent,
      onEventsBuffer: props.onEventsBuffer,
      onEventFlushReady: props.onEventFlushReady,
    };
  }, [props.onEvent, props.onEventsBuffer, props.onEventFlushReady]);

  useEffect(() => {
    if (!props.enabled) {
      return;
    }

    const tracker = new EditorTracker(editor, {
      ...props,
      onEvent: (event) => callbacksRef.current.onEvent?.(event),
      onEventsBuffer: (events) => callbacksRef.current.onEventsBuffer?.(events),
    });
    tracker.start();
    callbacksRef.current.onEventFlushReady?.(() => tracker.flushPendingEvents());

    return () => {
      callbacksRef.current.onEventFlushReady?.(null);
      tracker.stop();
    };
  }, [
    editor,
    props.documentId,
    props.userId,
    props.batchSize,
    props.flushInterval,
    props.enabled,
    props.copyPastePolicy,
  ]);

  return null;
}

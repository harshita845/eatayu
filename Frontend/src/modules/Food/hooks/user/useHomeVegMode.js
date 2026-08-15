import { useCallback } from 'react';

export const useHomeVegMode = ({
  vegMode,
  setVegMode,
  setShowVegModePopup,
  setShowEatAyuOffPopup,
}) => {
  const handleVegModeToggle = useCallback((e) => {
    // If e is an event, prevent propagation if needed, but here we just need to know the next state
    // If it's becoming true, show popup. If it's becoming false, show confirmation.

    // The EatAyu component usually passes the new checked value or we check the current state
    const becomingActive = !vegMode;

    if (becomingActive) {
      setVegMode(true);
      setShowVegModePopup(true);
    } else {
      setShowEatAyuOffPopup(true);
    }
  }, [vegMode, setVegMode, setShowVegModePopup, setShowEatAyuOffPopup]);

  const confirmEatAyuOff = useCallback(() => {
    setVegMode(false);
    setShowEatAyuOffPopup(false);
  }, [setVegMode, setShowEatAyuOffPopup]);

  return {
    handleVegModeToggle,
    confirmEatAyuOff
  };
};

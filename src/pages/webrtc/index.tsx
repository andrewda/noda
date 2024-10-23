import { Button } from "@/components/ui/button";
import { useAudioMonitor, useLocalStream, usePeerConnection } from "@/lib/communications";
import { useMemo } from "react";

export default function WebRTCPage() {
  const localStream = useLocalStream();
  const { peerConnection, connectionStatus, dataChannel, tracks, trackControls, createOffer } = usePeerConnection({ streamCount: 8 });
  const localTracks = useMemo(() => new Map(Array.from(trackControls?.entries() ?? []).map(([i, { outputTrack }]) => [i, outputTrack])), [trackControls]);

  const remoteAudioMonitors = useAudioMonitor(tracks);
  const localAudioMonitors = useAudioMonitor(localTracks);

  return (
    <div className="flex items-start h-screen w-full">
      <div className="flex flex-col items-center gap-4 w-full">
        <h1 className="text-4xl flex items-center mt-10">
          WebRTC
        </h1>

        <div className="flex flex-col">
          <span suppressHydrationWarning>
            <span>Local Stream:</span> <span className={localStream ? 'text-green-500' : 'text-neutral-400'}>{localStream ? 'connected' : 'disconnected'}</span>
          </span>
          <span suppressHydrationWarning>
            <span>Peer Connection:</span> <span className={connectionStatus === 'connected' ? 'text-green-500' : 'text-neutral-400'}>{connectionStatus ?? 'disconnected'}</span>
          </span>
        </div>

        <Button disabled={connectionStatus === 'connected'} onClick={() => createOffer?.()}>Create Offer</Button>

        <div className="flex flex-col gap-3 mt-4">
          {Array.from(trackControls?.entries() ?? []).map(([i, { micGain }]) => (
            <div key={i} className="flex items-center gap-6 outline outline-1 outline-gray-400 rounded-md p-3">
              <div className="w-full whitespace-nowrap font-mono">
                Channel {i + 1}
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-xs font-mono">
                  Tx
                  <span className={`w-2 h-2 rounded-full inline-block ${localAudioMonitors.get(i) ? 'bg-green-500 shadow-green-500 shadow-[0_0_8px_1px]' : 'bg-gray-500'}`}></span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  Rx
                  <span className={`w-2 h-2 rounded-full inline-block ${remoteAudioMonitors.get(i) ? 'bg-green-500 shadow-green-500 shadow-[0_0_8px_1px]' : 'bg-gray-500'}`}></span>
                </div>
              </div>

              <Button className="active:bg-primary/60" onMouseDown={() => micGain.gain.value = 1} onMouseUp={() => micGain.gain.value = 0}>PTT</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

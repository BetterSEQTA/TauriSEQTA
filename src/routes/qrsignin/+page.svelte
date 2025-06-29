<script lang="ts">
    import { onMount } from 'svelte';
    import { cache } from '../../utils/cache';
    import jsQR from 'jsqr';

    let qrCode: string | null = $state(null);

    function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target?.result as ArrayBuffer;
                const code = jsQR(new Uint8ClampedArray(imageData), 300, 300);
                if (code) {
                    qrCode = code.data;
                } else {
                    qrCode = 'No QR code found.';
                }
            };
            reader.readAsArrayBuffer(file);
        }
    }
</script>


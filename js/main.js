jQuery(document).ready(function () {
    function click_checkbox() {
        if (jQuery('.faq-interface__content-list-item-btn').length > 0) {
            jQuery('.faq-interface__content-list-item-wrap').on('click', function () {
                jQuery(this).parent(".faq-interface__content-list-item")
                    .siblings(".faq-interface__content-list-item")
                    .children(".faq-interface__content-list-item-btn")
                    .prop('checked', false);
                // connectToAgora();
                console.log("Click checkbox");
            });
        };
    };

    async function connectToAgora() {
        this.channelParameters = {
            appId: "a461a73b507042bcb2dda018dc794aee",
            isConnected: false,
            channel: "main",
            token: null,
            uid: 0,
            localAudioTrack: null,
            remoteAudioTrack: null,
            remoteUid: null
        };

        this.agoraEngine = AgoraRTC.createClient({mode: "rtc", codec: "vp8"});
        AgoraRTC.setLogLevel(0);

        await this.agoraEngine.join(
            this.channelParameters.appId,
            this.channelParameters.channel,
            this.channelParameters.token,
            this.channelParameters.uid
        );
        console.log("[INFO] Agora-SDK: Joined channel: " + this.channelParameters.channel);

        this.channelParameters.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        await this.agoraEngine.publish(this.channelParameters.localAudioTrack);
        console.log("[INFO] Agora-SDK: Publish success!");
    }

    click_checkbox();
});

jQuery(document).ready(async function () {
    let urlSearchParameters = new URLSearchParams(window.location.search);

    let stageList = new Map();
    let filter = "all";
    let hideAnswered = false;
    let idleTime = 0;
    let apiUrl = "http://localhost:8000";

    stageList.set("exhibition01", {
        stageInnerId: "b89e5b24-f682-486e-bafa-50ab0c0c2645",
        stageName: "Investors gallery 01"
    });
    stageList.set("exhibition02", {
        stageInnerId: "fdda15a5-c096-4391-a52d-055f3b5374b6",
        stageName: "Investors gallery 02"
    });

    if(urlSearchParameters.has('stageId') && stageList.get(urlSearchParameters.get('stageId'))) {
        // Setup idle detection rate
        let idleInterval = setInterval(timerIncrement, 60000); // 1 minute

        // Zero the idle timer on mouse movement.
        $(this).mousemove(function (e) {
            idleTime = 0;
        });
        $(this).keypress(function (e) {
            idleTime = 0;
        });

        // Setup properties and agora
        let channelParameters = {
            appId: "a461a73b507042bcb2dda018dc794aee",
            isConnected: false,
            connectionStatus: "disconnected",
            channel: urlSearchParameters.get('stageId'),
            token: null,
            uid: 1,
            localAudioTrack: null,
            remoteAudioTrack: null,
            remoteUid: null
        };
        let questionList = new Map();

        jQuery('#connection-status').text("Stage: " + stageList.get(urlSearchParameters.get('stageId')).stageName);

        // Setup Agora SDK
        let agoraEngine = AgoraRTC.createClient({mode: "rtc", codec: "vp8"});
        AgoraRTC.setLogLevel(5);

        async function agoraSDKConnect() {
            console.log("[INFO] Agora-SDK: Trying to join channel " + channelParameters.channel);

            if (channelParameters.isConnected) {
                console.log("[INFO] Agora-SDK: Connection already established to channel " + channelParameters.channel + ". Disconnect from the channel and try again.");
            } else {
                await agoraEngine.join(
                    channelParameters.appId,
                    channelParameters.channel,
                    channelParameters.token,
                    channelParameters.uid
                );
                console.log("[INFO] Agora-SDK: Joined channel: " + channelParameters.channel);
                channelParameters.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                await agoraEngine.publish(channelParameters.localAudioTrack);
                console.log("[INFO] Agora-SDK: Publish success!");
                channelParameters.isConnected = true;
                channelParameters.connectionStatus = "connected";
                updateReplyButton();

                for (element of $('.faq-interface__content-list-item')) {
                    if ($(element).children(".faq-interface__content-list-item-btn").is(":checked")) {
                        let questionId = $(element).attr('id');
                        if (!questionList.get(questionId).answered) {
                            let questionUpdate = questionList.get(questionId);
                            questionUpdate.answered = true;
                            questionList.set(questionId, questionUpdate);
                            axios.post(apiUrl + '/api/updateQuestionList', {
                                questionId: questionId,
                                answered: true
                            });
                            console.log("Set " + questionId + " as answered")
                            setRecordReadStatus(questionId, true);
                        }
                    }
                }
            }
        }
        async function agoraSDKDisconnect() {
            await agoraEngine.unpublish(channelParameters.localAudioTrack);
            console.log("[INFO] Agora-SDK: Unpublish success!");

            await agoraEngine.leave(
                channelParameters.appId,
                channelParameters.channel,
                channelParameters.token,
                channelParameters.uid
            );

            console.log("[INFO] Agora-SDK: Leave channel: " + channelParameters.channel);
            channelParameters.isConnected = false;
            channelParameters.connectionStatus = "disconnected";
            updateReplyButton();
        }

        // Setup functions
        async function updateQuestionListData() {
            const { data } = await axios.get(apiUrl + '/api/questionList?stageId=' +
                stageList.get(urlSearchParameters.get('stageId')).stageInnerId);
            for (let question of data) {
                questionList.set(question.id, question);
            }
        };
        function updateQuestionList() {
            let counter = 0;
            for (const [key, value] of questionList.entries()) {
                if (filter === "approved") {
                    if ($("#" + key).length === 0) {
                        if (value.approved) {
                            if (hideAnswered) {
                                if (!value.answered) {
                                    appendNewRecord(value, counter);
                                }
                            } else {
                                appendNewRecord(value, counter);
                                if (value.answered)
                                    setRecordReadStatus(key.toString(), true);
                            }
                        }
                    }
                    counter++;
                } else if (filter === "unapproved") {
                    if ($("#" + key).length === 0) {
                        if (!value.approved) {
                            if (hideAnswered) {
                                if (!value.answered) {
                                    appendNewRecord(value, counter);
                                }
                            } else {
                                appendNewRecord(value, counter);
                                if (value.answered)
                                    setRecordReadStatus(key.toString(), true);
                            }
                        }
                    }
                    counter++;
                }  else if (filter === "all") {
                    if ($("#" + key).length === 0) {
                        if (hideAnswered) {
                            if (!value.answered) {
                                appendNewRecord(value, counter);
                            }
                        } else {
                            appendNewRecord(value, counter);
                            if (value.answered)
                                setRecordReadStatus(key.toString(), true);
                        }
                    }
                    counter++;
                }
            }
        }
        function appendNewRecord(data, i) {
            let element = $(
            `<li class="faq-interface__content-list-item" id="${data.id}">
                <input type="checkbox" class="faq-interface__content-list-item-btn" id="faq-interface__content-list-item-btn--${i}">
                <label class="faq-interface__content-list-item-wrap  flex  flex-dc" for="faq-interface__content-list-item-btn--${i}">
                    <div class="faq-interface__content-list-item-subtitle  flex">
                        <div class="faq-interface__content-list-item-name">
                            <p>${data.userName}</p>
                        </div>
                        <div class="faq-interface__content-list-item-time">
                            <p></p>
                        </div>
                    </div>
                    <div class="faq-interface__content-list-item-question-wrapper">
                        <div class="faq-interface__content-list-item-question">
                            <p>${data.text}</p>
                        </div>
                    </div>
                </label>
                <div class="faq-interface__content-list-item-complete">
                    <img class="faq-interface__all-img" src="https://cdn.glitch.global/1b2ea0b0-1236-4364-9e79-334e58db0684/ok.svg?v=1669041183181"">
                </div>
            </li>`)
            $(".faq-interface__content-list").append(element);

            element.on('click', function () {
                let checkboxElement = jQuery(this)
                    .siblings(".faq-interface__content-list-item")
                    .children(".faq-interface__content-list-item-btn");

                checkboxElement.prop('checked', false);

                let questionId = jQuery(this).attr('id');

                if (channelParameters.connectionStatus === "connected") {
                    if (!questionList.get(questionId).answered) {
                        let questionUpdate = questionList.get(questionId);
                        questionUpdate.answered = true;
                        questionList.set(questionId, questionUpdate);
                        axios.post(apiUrl + '/api/updateQuestionList', {
                            questionId: questionId,
                            answered: true
                        });
                        console.log("Set " + questionId + " as answered")
                        setRecordReadStatus(questionId, true);
                    }
                }
            });

            jQuery('.faq-interface-main').css({'display': 'flex'});
        };
        function updateReplyButton() {
            if(channelParameters.connectionStatus === "disconnected") {
                jQuery('.faq-interface__content-list-item-reply-label-text').text("Disconnected")
                jQuery('.faq-interface__content-list-item-reply-label-btn').css({
                    'background-color': "#EFA220",
                    // 'mask-image': 'url("../img/reply.svg")'
                });
            } else if(channelParameters.connectionStatus === "connected") {
                jQuery('.faq-interface__content-list-item-reply-label-text').text("Broadcasting");
                jQuery('.faq-interface__content-list-item-reply-label-btn').css({
                    'background-color': '#EF202C',
                    // 'mask-image': 'url("../img/pause.svg")'
                });
            } else if(channelParameters.connectionStatus === "connecting"){
                jQuery('.faq-interface__content-list-item-reply-label-text').text("Connecting ...");
                jQuery('.faq-interface__content-list-item-reply-label-btn').css({
                    'background-color': "#BB682B"
                });
            } else if(channelParameters.connectionStatus === "disconnecting"){
                jQuery('.faq-interface__content-list-item-reply-label-text').text("Disconnecting ...");
                jQuery('.faq-interface__content-list-item-reply-label-btn').css({
                    'background-color': "#BB682B"
                });
            }
        };
        function setRecordReadStatus(id, isAnswered) {
            let recordElement = jQuery('#' + id);

            if (isAnswered) {
                recordElement.find(".faq-interface__content-list-item-complete").css({
                    'display': 'block'
                });
                recordElement.find(".faq-interface__content-list-item-subtitle")
                    .toggleClass("faq-interface__content-list-item-subtitle faq-interface__content-list-item-subtitle--complete")
                recordElement.find(".faq-interface__content-list-item-question-wrapper")
                    .toggleClass("faq-interface__content-list-item-question-wrapper faq-interface__content-list-item-question-wrapper--complete")
            } else {
                recordElement.find(".faq-interface__content-list-item-complete").css({
                    'display': 'none'
                });
                recordElement.find(".faq-interface__content-list-item-subtitle--complete")
                    .toggleClass("faq-interface__content-list-item-subtitle--complete faq-interface__content-list-item-subtitle")
                recordElement.find(".faq-interface__content-list-item-question-wrapper--complete")
                    .toggleClass("faq-interface__content-list-item-question-wrapper--complete faq-interface__content-list-item-question-wrapper")
            }
        };
        function timerIncrement() {
            idleTime = idleTime + 1;
            if (idleTime > 9) { // 10 minutes
                if(channelParameters.connectionStatus === "connected") {
                    agoraSDKDisconnect();
                }
            }
        };

        // ======================== MAIN SCRIPT ====================================================
        // Write questions from server
        await updateQuestionListData();
        updateQuestionList();

        let intervalId = window.setInterval(function() {
            console.log("Trigger update");
            updateQuestionListData();
            updateQuestionList();
        }, 30000);

        updateReplyButton();

        // Connect to agora at micro-icon click
        jQuery('.faq-interface__content-list-item-reply-label-btn').on('click', function (event) {
            if(channelParameters.connectionStatus === "disconnected") {
                channelParameters.connectionStatus = "connecting";
                updateReplyButton();
                agoraSDKConnect();
            } else if(channelParameters.connectionStatus === "connected") {
                channelParameters.connectionStatus = "disconnecting";
                updateReplyButton();
                agoraSDKDisconnect();
            } else {
                console.log("[INFO] AgoraSDK: Connection in progress, please wait a few moment");
            }
        });

        jQuery('.faq-interface__content-list-item-reply-btn').on('change', function (event) {
            if(channelParameters.connectionStatus === "connecting") {
                event.target.checked = true;
            } else {
                event.target.checked = false;
            }
        });

        $("#address_cb").change(function(event) {
            alert('foo');
            event.preventDefault();
            event.stopImmediatePropagation(); //Works
            return false; //would call event.preventDefault() and event.stopPropagation() but not stopImmediatePropagation()
        });

        $('.filter-option').on('click', async function (e) {
            filter = e.target.innerText.toLowerCase();

            for (let element of $('.filter-option')) {
                if (filter === element.innerText.toLowerCase()) {
                    jQuery(element).addClass("active");
                } else {
                    jQuery(element).removeClass("active");
                }
            }
            $(".faq-interface__content-list").html("");
            jQuery('.faq-interface-main').css({'display':'none'});
            await updateQuestionListData();
            updateQuestionList();
        });

        $('#one').on('click', async function (e) {
            hideAnswered = e.target.checked;
            $(".faq-interface__content-list").html("");
            jQuery('.faq-interface-main').css({'display':'none'});
            await updateQuestionListData();
            updateQuestionList();
        });
    } else {
        console.log("Incorrect stageId");
        jQuery('#connection-status').text("Incorrect stageId");
    }
});
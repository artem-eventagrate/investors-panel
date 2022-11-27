jQuery(document).ready(async function () {
    let urlSearchParameters = new URLSearchParams(window.location.search);

    let stageList = new Map();
    let filter = "all";
    let hideAnswered = false;
    let idleTime = 0;
    let apiUrl = "https://digital-twins-panel.eagdxb.online";

    stageList.set("1db2b01a-e4ce-4e4d-981b-dab2fc06e94c", {
        stageInnerId: "exhibition01",
        stageName: "MINISTRY OF TOURISM"
    });
    stageList.set("b38f8bf1-de7a-46b1-aea4-c54209b28d6a", {
        stageInnerId: "exhibition02",
        stageName: "ACCELERATOR OF HUMAN PROGRESS (NEOM)"
    });
    stageList.set("ea0d36d5-74f7-47fc-b0b7-fbe05bf8bd1c", {
        stageInnerId: "exhibition08",
        stageName: "THE RED SEA DEVELOPMENT COMPANY"
    });
    stageList.set("de09bd18-05c4-48f8-9450-7fd5e1d5f13d", {
        stageInnerId: "exhibition06",
        stageName: "SHARQIA DEVELOPMENT AUTHORITY"
    });
    stageList.set("27ee2c81-4b00-4fa4-98cf-b6046f1cfe19", {
        stageInnerId: "exhibition04",
        stageName: "ASEER DEVELOPMENT AUTHORITY"
    });
    stageList.set("49585ac8-932d-4d72-9b70-76c60b0201ff", {
        stageInnerId: "exhibition03",
        stageName: "JEDDAH CENTRAL DEVELOPMENT COMPANY"
    });
    stageList.set("831f8d96-55d7-4874-82cf-7eb2ed6b8bb3", {
        stageInnerId: "exhibition07",
        stageName: "DIRIYAH GATE DEVELOPMENT AUTHORITY"
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
            appId: "a61ae2bec03e4bdb843836695ab14785",
            isConnected: false,
            connectionStatus: "disconnected",
            channel: stageList.get(urlSearchParameters.get('stageId')).stageInnerId,
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
                            axios.post(apiUrl + '/api/updateQuestion', {
                                questionId: questionId,
                                answered: true
                            });
                            console.log("Set " + questionId + " as answered")
                            setRecordReadStatus(questionId, true);
                            updateQuestionList();
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
        async function getQuestionListData() {
            const { data } = await axios.get(apiUrl + '/api/questionList/' + urlSearchParameters.get('stageId'));
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
                        axios.post(apiUrl + '/api/updateQuestion', {
                            questionId: questionId,
                            answered: true
                        });
                        console.log("Set " + questionId + " as answered")
                        setRecordReadStatus(questionId, true);
                        updateQuestionList();
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
        await getQuestionListData();
        updateQuestionList();

        let intervalId = window.setInterval(async function() {
            console.log("Trigger update");
            await getQuestionListData();
            updateQuestionList();
        }, 15000);

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
            updateQuestionList();
        });

        $('#one').on('click', async function (e) {
            hideAnswered = e.target.checked;
            $(".faq-interface__content-list").html("");
            jQuery('.faq-interface-main').css({'display':'none'});
            updateQuestionList();
        });
    } else {
        console.log("Incorrect stageId");
        jQuery('#connection-status').text("Incorrect stageId");
    }
});
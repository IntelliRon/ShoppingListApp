package xyz.intelliron.shoppinglistapp.data.apirequest.sections;

import com.google.gson.annotations.SerializedName;

public class CreateSectionRequest {
    @SerializedName("section_name")
    private final String sectionName;

    public CreateSectionRequest(String sectionName) {
        this.sectionName = sectionName;
    }

    public String getSectionName() {
        return sectionName;
    }
}
